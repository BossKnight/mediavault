// Creates a single demo account for local development so you don't have to
// go through the registration form the first time you run the app.
//   npm run prisma:seed
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL ?? "demo@mediavault.app";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "password123";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log(`Demo user already exists: ${DEMO_EMAIL}`);
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await prisma.user.create({
    data: { email: DEMO_EMAIL, passwordHash, name: "Demo User" },
  });

  console.log(`Created demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
