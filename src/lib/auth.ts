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

// Accept the configured site plus its www/apex twin and Vercel's own domains (production + previews).
const withWwwTwin = (url: string) => {
  const u = new URL(url);
  u.hostname = u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`;
  return [url, u.origin];
};
const trustedOrigins = [
  ...[process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_SITE_URL].filter((h): h is string => !!h).flatMap(withWwwTwin),
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
].filter((h): h is string => !!h);

export const auth = betterAuth({
  baseURL: siteURL,
  trustedOrigins,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
  user: { additionalFields: { role: { type: "string", defaultValue: "staff", input: false } } },
  session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60, cookieCache: { enabled: true, maxAge: 5 * 60 } },
  // Very relaxed rate limit — only 1 admin, not a public endpoint
  rateLimit: { enabled: false },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  plugins: [nextCookies()],
});
