import "server-only";
import webpush, { WebPushError } from "web-push";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export type StaffNotification = {
  title: string;
  body: string;
  /** Admin page to open when the notification is tapped. */
  url: string;
  /** Notifications with the same tag replace each other (one per conversation, like WhatsApp). */
  tag?: string;
};

let configured: boolean | undefined;
function ready() {
  if (configured !== undefined) return configured;
  const env = serverEnv();
  configured = Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  if (configured) {
    webpush.setVapidDetails(env.VAPID_SUBJECT ?? "mailto:admin@localhost", env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  }
  return configured;
}

export function pushEnabled() {
  return ready();
}

/**
 * Sends a notification to every subscribed staff device. Never throws: a failed push must not break
 * the visitor's request, so call it from `after()`. Devices the push service reports gone are removed.
 */
export async function notifyStaff(n: StaffNotification, only?: { userId: string }) {
  try {
    if (!ready()) return;
    const subs = await db.pushSubscription.findMany({
      where: only ? { userId: only.userId } : undefined,
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length === 0) return;
    const payload = JSON.stringify({ ...n, body: n.body.length > 160 ? `${n.body.slice(0, 157)}…` : n.body });
    const gone: string[] = [];
    const delivered: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
            TTL: 60 * 60 * 24,
            urgency: "high",
            topic: n.tag?.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined,
          });
          delivered.push(s.id);
        } catch (err) {
          if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) gone.push(s.id);
          else logger.warn("push.send_failed", { status: err instanceof WebPushError ? err.statusCode : undefined });
        }
      }),
    );
    await Promise.all([
      gone.length ? db.pushSubscription.deleteMany({ where: { id: { in: gone } } }) : null,
      delivered.length ? db.pushSubscription.updateMany({ where: { id: { in: delivered } }, data: { lastUsedAt: new Date() } }) : null,
    ]);
  } catch (err) {
    logger.error("push.notify_failed", err);
  }
}
