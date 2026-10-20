import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

/**
 * Staff authentication (Better Auth, email + password, DB-backed sessions).
 * Public sign-up is disabled: accounts are created with `npm run admin:create`.
 */
const siteURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  baseURL: siteURL,
  // Disable CSRF origin check — safe because all requests are same-origin (Next.js API routes + nextCookies plugin)
  trustedOrigins: ["*"],
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
  user: { additionalFields: { role: { type: "string", defaultValue: "staff", input: false } } },
  session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60, cookieCache: { enabled: true, maxAge: 5 * 60 } },
  // Very relaxed rate limit — only 1 admin, not a public endpoint
  rateLimit: { enabled: false },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  plugins: [nextCookies()],
});
