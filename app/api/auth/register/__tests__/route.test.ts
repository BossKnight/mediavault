import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, create, consumeRateLimit } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  consumeRateLimit: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique, create } } }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  consumeRateLimit,
}));
// Real bcrypt at cost 12 takes ~250ms per call; the hash itself isn't under test.
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(async () => "hashed") } }));

import { POST } from "@/app/api/auth/register/route";

function registerRequest(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.7" },
    body: JSON.stringify(body),
  });
}

const validBody = { email: "Reader@Example.com", password: "correct-horse", name: "Reader" };

beforeEach(() => {
  consumeRateLimit.mockReset().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  findUnique.mockReset().mockResolvedValue(null);
  create.mockReset().mockImplementation(async ({ data }) => ({ id: "user-1", email: data.email, name: data.name }));
});

describe("POST /api/auth/register", () => {
  it("creates the user with a lowercased email and hashed password", async () => {
    const response = await POST(registerRequest(validBody));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      user: { id: "user-1", email: "reader@example.com", name: "Reader" },
    });
    expect(create.mock.calls[0]![0].data).toEqual({
      email: "reader@example.com",
      passwordHash: "hashed",
      name: "Reader",
    });
  });

  it("counts each attempt against the client IP", async () => {
    await POST(registerRequest(validBody));

    expect(consumeRateLimit.mock.calls[0]![0]).toBe("register:203.0.113.7");
  });

  it("returns 429 with Retry-After once the IP is over the limit, before hashing", async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 1800 });

    const response = await POST(registerRequest(validBody));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("1800");
    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an invalid body", async () => {
    const response = await POST(registerRequest({ email: "not-an-email", password: "short" }));

    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 409 when the email is already registered", async () => {
    findUnique.mockResolvedValue({ id: "existing" });

    const response = await POST(registerRequest(validBody));

    expect(response.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 409 when a concurrent signup wins the unique constraint", async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`email`)", {
        code: "P2002",
        clientVersion: Prisma.prismaVersion.client,
      }),
    );

    const response = await POST(registerRequest(validBody));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "An account with that email already exists" });
  });

  it("rethrows unrelated database errors", async () => {
    create.mockRejectedValue(new Error("connection lost"));

    await expect(POST(registerRequest(validBody))).rejects.toThrow("connection lost");
  });
});
