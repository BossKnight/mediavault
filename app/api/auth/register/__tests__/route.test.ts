import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, create } = vi.hoisted(() => ({ findUnique: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique, create } } }));
// Real bcrypt at cost 12 takes ~250ms per call; the hash itself isn't under test.
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(async () => "hashed") } }));

import { POST } from "@/app/api/auth/register/route";

function registerRequest(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = { email: "Reader@Example.com", password: "correct-horse", name: "Reader" };

beforeEach(() => {
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
