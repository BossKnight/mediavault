import { prisma } from "@/lib/prisma";

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  // Each signup runs a cost-12 bcrypt hash, so this also caps CPU spent on
  // scripted registrations.
  register: { limit: 5, windowSeconds: 60 * 60 },
  login: { limit: 10, windowSeconds: 15 * 60 },
  // UPCitemdb's free tier allows 100 lookups a day per server IP, shared by
  // every user, so one heavy scanner shouldn't be able to spend it all.
  barcode: { limit: 30, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// Rows older than this can't belong to any active window.
const STALE_ROW_SECONDS = 24 * 60 * 60;
const CLEANUP_PROBABILITY = 0.01;

/**
 * Counts one request against `key` and reports whether it fits within
 * `rule`. The read, reset, and increment happen in one atomic upsert, so
 * concurrent requests can't both see a stale count.
 *
 * Window starts are truncated to milliseconds to match the column's
 * precision; otherwise Postgres rounds them on write, sometimes into the
 * future, and Retry-After comes out a second long.
 *
 * Fails open: if the database is unreachable the request is allowed, since
 * blocking every login because the limiter is down would be worse than
 * briefly not limiting.
 */
export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  try {
    const [row] = await prisma.$queryRaw<{ count: number; retryAfterSeconds: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "windowStart")
      VALUES (${key}, 1, date_trunc('milliseconds', now()))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."windowStart" <= now() - make_interval(secs => ${rule.windowSeconds}::double precision)
          THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "windowStart" = CASE
          WHEN "RateLimit"."windowStart" <= now() - make_interval(secs => ${rule.windowSeconds}::double precision)
          THEN date_trunc('milliseconds', now())
          ELSE "RateLimit"."windowStart"
        END
      RETURNING
        "count",
        GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
          "windowStart" + make_interval(secs => ${rule.windowSeconds}::double precision) - now()
        ))))::int AS "retryAfterSeconds"`;

    if (Math.random() < CLEANUP_PROBABILITY) {
      void prisma.$executeRaw`
        DELETE FROM "RateLimit"
        WHERE "windowStart" < now() - make_interval(secs => ${STALE_ROW_SECONDS}::double precision)`.catch(
        (error: unknown) => console.error("Rate limit cleanup failed", error),
      );
    }

    return { allowed: row!.count <= rule.limit, retryAfterSeconds: row!.retryAfterSeconds };
  } catch (error) {
    console.error("Rate limit check failed; allowing request", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/**
 * The client's IP for per-IP limits. Reads the last X-Forwarded-For entry:
 * a reverse proxy appends the address it actually saw, while earlier
 * entries are whatever the client chose to send. Without any proxy in
 * front of the app, this header is fully client-controlled, so per-IP
 * limits only hold behind a proxy that sets it.
 */
export function clientIpFromHeaders(headers: Headers | Record<string, string | string[] | undefined>): string {
  const raw = headers instanceof Headers ? headers.get("x-forwarded-for") : headers["x-forwarded-for"];
  const value = Array.isArray(raw) ? raw.join(",") : raw;
  const last = value?.split(",").map((part) => part.trim()).filter(Boolean).at(-1);
  return last ?? "unknown";
}
