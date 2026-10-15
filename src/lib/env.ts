import "server-only";
import { z } from "zod";

/** Server-only environment. Values are validated lazily and never logged. */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is not set"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url().optional(),
  ENABLE_DEMO_DATA: z.enum(["true", "false"]).optional(),
  TRACKING_PROVIDER: z.enum(["database"]).default("database"),
});

let cached: z.infer<typeof schema> | undefined;

export function serverEnv() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Report which keys are wrong, never their values.
    const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid server environment: ${keys}`);
  }
  cached = parsed.data;
  return cached;
}

/** Demo records are visible in development, or when explicitly enabled. */
export function demoDataEnabled() {
  const flag = process.env.ENABLE_DEMO_DATA;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}
