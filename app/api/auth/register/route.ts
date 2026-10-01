import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIpFromHeaders, consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1).max(80).optional(),
});

const DUPLICATE_EMAIL_ERROR = "An account with that email already exists";

export async function POST(request: Request) {
  const rateLimit = await consumeRateLimit(
    `register:${clientIpFromHeaders(request.headers)}`,
    RATE_LIMITS.register,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many sign-up attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: DUPLICATE_EMAIL_ERROR }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, name: parsed.data.name },
      select: { id: true, email: true, name: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    // The lookup above can't rule out a concurrent signup with the same
    // email, so the unique constraint on User.email is the real guard.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: DUPLICATE_EMAIL_ERROR }, { status: 409 });
    }
    throw error;
  }
}
