"use server";

import { z } from "zod";
import { requireStaff } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { notifyStaff } from "@/server/push";

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Saves this device's push subscription for the signed-in staff member. */
export async function savePushSubscription(input: unknown, userAgent?: string): Promise<{ ok: boolean }> {
  const user = await requireStaff();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { endpoint, keys } = parsed.data;
  try {
    await db.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user.id, userAgent: userAgent?.slice(0, 300) },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id, lastUsedAt: new Date() },
    });
    return { ok: true };
  } catch (err) {
    logger.error("push.subscribe_failed", err);
    return { ok: false };
  }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const user = await requireStaff();
  await db.pushSubscription.deleteMany({ where: { endpoint: endpoint.slice(0, 1000), userId: user.id } });
}

/** Sends a test notification so staff can check it arrives. */
export async function sendTestNotification(): Promise<void> {
  const user = await requireStaff();
  await notifyStaff(
    {
      title: "Notifications are on",
      body: "You'll get an alert like this for every new chat message, inquiry and request.",
      url: "/admin",
      tag: "test",
    },
    { userId: user.id },
  );
}
