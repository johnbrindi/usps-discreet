import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

/**
 * Staff authentication (Better Auth, email + password, DB-backed sessions).
 * Public sign-up is disabled: accounts are created with `npm run admin:create`.
 */
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
  user: { additionalFields: { role: { type: "string", defaultValue: "staff", input: false } } },
  session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60 },
  rateLimit: { enabled: true, window: 60, max: 30 },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  plugins: [nextCookies()],
});
