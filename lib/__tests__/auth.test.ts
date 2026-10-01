import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, consumeRateLimit, compare } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  consumeRateLimit: vi.fn(),
  compare: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  consumeRateLimit,
}));
vi.mock("bcryptjs", () => ({ default: { compare } }));

import type { CredentialsConfig } from "next-auth/providers/credentials";
import { authOptions } from "@/lib/auth";
import { TOO_MANY_LOGIN_ATTEMPTS } from "@/lib/auth-errors";

// CredentialsProvider keeps the user-supplied authorize on `options`.
const { authorize } = (authOptions.providers[0] as CredentialsConfig).options as CredentialsConfig;
const request = { headers: { "x-forwarded-for": "203.0.113.7" } };
const credentials = { email: "Reader@Example.com", password: "correct-horse" };

beforeEach(() => {
  findUnique.mockReset().mockResolvedValue({
    id: "user-1",
    email: "reader@example.com",
    name: "Reader",
    passwordHash: "hash",
  });
  compare.mockReset().mockResolvedValue(true);
  consumeRateLimit.mockReset().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
});

describe("credentials authorize", () => {
  it("signs in with a correct password, counting the attempt against the client IP", async () => {
    const user = await authorize(credentials, request);

    expect(user).toEqual({ id: "user-1", email: "reader@example.com", name: "Reader" });
    expect(consumeRateLimit.mock.calls[0]![0]).toBe("login:203.0.113.7");
    expect(findUnique).toHaveBeenCalledWith({ where: { email: "reader@example.com" } });
  });

  it("rejects a wrong password", async () => {
    compare.mockResolvedValue(false);

    expect(await authorize(credentials, request)).toBeNull();
  });

  it("throws a dedicated error once the IP is over the limit, before checking the password", async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 300 });

    await expect(authorize(credentials, request)).rejects.toThrow(TOO_MANY_LOGIN_ATTEMPTS);
    expect(findUnique).not.toHaveBeenCalled();
    expect(compare).not.toHaveBeenCalled();
  });
});
