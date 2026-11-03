"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { audit } from "@/server/audit";
import { clearBlocklistCache } from "@/server/blocklist";
import { decodeChatImage } from "@/server/chat";
import { MAX_CHAT_IMAGE_BYTES, chatMessageSchema } from "@/validation/chat";
import type { ActionState } from "./types";

export async function replyToConversation(
  conversationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();
  if (typeof conversationId !== "string") return { status: "error", message: "Invalid conversation." };
  const parsed = chatMessageSchema.safeParse({ body: formData.get("body") ?? "", image: formData.get("image") || undefined });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  const image = parsed.data.image ? decodeChatImage(parsed.data.image, MAX_CHAT_IMAGE_BYTES) : null;
  if (parsed.data.image && !image) return { status: "error", message: "That photo couldn't be sent. Try a JPEG or PNG." };
  const target = await db.chatConversation.findUnique({ where: { id: conversationId }, select: { blockedAt: true } });
  if (target?.blockedAt) return { status: "error", message: "This visitor is blocked. Unblock them to reply." };
  try {
    await db.$transaction([
      db.chatMessage.create({
        data: {
          conversationId,
          sender: "AGENT",
          body: parsed.data.body,
          agentUserId: user.id,
          ...(image && { imageData: image.data, imageType: image.type }),
        },
      }),
      db.chatConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), status: "OPEN" } }),
    ]);
  } catch (err) {
    logger.error("chat.reply_failed", err);
    return { status: "error", message: "Could not send the reply." };
  }
  revalidatePath(`/admin/messages/${conversationId}`);
  return { status: "success" };
}

// Bound action arguments come from the client, so validate them like any other input.
const CHAT_STATUSES = new Set(["OPEN", "CLOSED"]);
const INQUIRY_STATUSES = new Set(["NEW", "IN_PROGRESS", "CLOSED"]);

export async function setConversationStatus(conversationId: string, status: "OPEN" | "CLOSED") {
  const user = await requireStaff();
  if (!CHAT_STATUSES.has(status) || typeof conversationId !== "string") return;
  await db.$transaction(async (tx) => {
    await tx.chatConversation.update({ where: { id: conversationId }, data: { status } });
    await audit(tx, { actorId: user.id, action: `chat.${status.toLowerCase()}`, entityType: "chat", entityId: conversationId });
  });
  revalidatePath("/admin/messages");
  revalidatePath(`/admin/messages/${conversationId}`);
}

/**
 * Blocks (or unblocks) the visitor behind a conversation. A blocked visitor can no longer chat and
 * is refused the whole public website, matched by their chat cookie and their last known IP.
 */
export async function setConversationBlocked(conversationId: string, blocked: boolean) {
  const user = await requireStaff();
  if (typeof conversationId !== "string" || typeof blocked !== "boolean") return;
  await db.$transaction(async (tx) => {
    const convo = await tx.chatConversation.findUnique({ where: { id: conversationId }, select: { visitorIp: true } });
    if (!convo) return;
    await tx.chatConversation.update({
      where: { id: conversationId },
      data: blocked
        ? { blockedAt: new Date(), blockedIp: convo.visitorIp, status: "CLOSED" }
        : { blockedAt: null, blockedIp: null },
    });
    await audit(tx, {
      actorId: user.id,
      action: blocked ? "chat.block" : "chat.unblock",
      entityType: "chat",
      entityId: conversationId,
      ...(blocked && convo.visitorIp && { details: { ip: convo.visitorIp } }),
    });
  });
  clearBlocklistCache();
  revalidatePath("/admin/messages");
  revalidatePath(`/admin/messages/${conversationId}`);
}

export async function setInquiryStatus(id: string, status: "NEW" | "IN_PROGRESS" | "CLOSED") {
  const user = await requireStaff();
  if (!INQUIRY_STATUSES.has(status) || typeof id !== "string") return;
  await db.$transaction(async (tx) => {
    await tx.contactInquiry.update({ where: { id }, data: { status } });
    await audit(tx, { actorId: user.id, action: "inquiry.status", entityType: "inquiry", entityId: id, details: { status } });
  });
  revalidatePath("/admin/inquiries");
}
