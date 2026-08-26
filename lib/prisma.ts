import { PrismaClient } from "@prisma/client";

// Prevents exhausting the database connection pool from hot-reload creating
// a new PrismaClient on every file change in development.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
