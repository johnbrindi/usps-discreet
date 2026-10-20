import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

/**
 * Staff authentication (Better Auth, email + password, DB-backed sessions).
 * Public sign-up is disabled: accounts are created with `npm run admin:create`.
 */
// On Vercel, fall back to the platform's own domains so sign-in works on production and preview
// deployments even before BETTER_AUTH_URL is set.
const vercelOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
].filter((h): h is string => !!h);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? vercelOrigins[0],
  trustedOrigins: vercelOrigins,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
  user: { additionalFields: { role: { type: "string", defaultValue: "staff", input: false } } },
  // The signed cookie cache answers session checks without a database query for 5 minutes at a time.
  // Trade-off: a revoked session or changed role takes up to 5 minutes to apply.
  session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60, cookieCache: { enabled: true, maxAge: 5 * 60 } },
  // 100 attempts per 5-minute window — generous for an admin-only login page
  rateLimit: { enabled: true, window: 300, max: 100 },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  plugins: [nextCookies()],
});
