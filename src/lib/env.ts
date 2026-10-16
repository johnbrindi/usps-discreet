import "server-only";
import { z } from "zod";

/** Server-only environment. Values are validated lazily and never logged. */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is not set"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url().optional(),
  ENABLE_DEMO_DATA: z.enum(["true", "false"]).optional(),
  TRACKING_PROVIDER: z.enum(["database"]).default("database"),

  // Carrier APIs — each is optional; a provider is enabled when its credentials are present.
  USPS_CLIENT_ID: z.string().min(1).optional(),
  USPS_CLIENT_SECRET: z.string().min(1).optional(),
  USPS_API_BASE: z.url().optional(),
  DHL_API_KEY: z.string().min(1).optional(),
  SHIP24_API_KEY: z.string().min(1).optional(),
  TRACKINGMORE_API_KEY: z.string().min(1).optional(),
  /** Let the public look up carrier numbers that staff haven't added (uses API quota). */
  PUBLIC_CARRIER_LOOKUP: z.enum(["true", "false"]).default("false"),
  /** Daily cap on new public carrier lookups, per server instance. */
  PUBLIC_CARRIER_LOOKUP_DAILY_LIMIT: z.coerce.number().int().min(0).default(200),
  CARRIER_SYNC_INTERVAL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
  /** Bearer token for /api/cron/sync-shipments. */
  CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 characters").optional(),
});

let cached: z.infer<typeof schema> | undefined;

export function serverEnv() {
  if (cached) return cached;
  // Treat blank values ("KEY=") as unset so optional credentials can be left empty in .env.
  const env = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    // Report which keys are wrong, never their values.
    const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid server environment: ${keys}`);
  }
  cached = parsed.data;
  return cached;
}

/** Demo records are hidden everywhere unless ENABLE_DEMO_DATA=true is set explicitly. */
export function demoDataEnabled() {
  return process.env.ENABLE_DEMO_DATA === "true";
}
