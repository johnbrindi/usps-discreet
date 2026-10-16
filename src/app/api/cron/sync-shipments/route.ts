import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { syncDueShipments } from "@/server/tracking/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Constant-time comparison of the bearer token (hashed first so lengths always match). */
function authorized(req: NextRequest, secret: string) {
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(secret).digest();
  return given.length > 0 && timingSafeEqual(a, b);
}

/**
 * Polls carriers for shipments that are due. Call every 5–15 minutes from a scheduler
 * (Vercel Cron, GitHub Actions, cron + curl) with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!authorized(req, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const summary = await syncDueShipments({ limit: 40, concurrency: 3, budgetMs: 50_000 });
    logger.info("carrier.cron_done", { due: summary.due, processed: summary.processed, pruned: summary.prunedLogs });
    return NextResponse.json(summary);
  } catch (err) {
    logger.error("carrier.cron_failed", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
