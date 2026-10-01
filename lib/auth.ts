import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { TOO_MANY_LOGIN_ATTEMPTS } from "@/lib/auth-errors";
import { clientIpFromHeaders, consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const rateLimit = await consumeRateLimit(
          `login:${clientIpFromHeaders(req.headers ?? {})}`,
          RATE_LIMITS.login,
        );
        // NextAuth surfaces a thrown error's message to the client as
        // `signIn(...).error`, which the login form maps to its own copy.
        if (!rateLimit.allowed) throw new Error(TOO_MANY_LOGIN_ATTEMPTS);

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
