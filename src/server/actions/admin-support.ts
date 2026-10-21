"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { audit } from "@/server/audit";
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

export async function setInquiryStatus(id: string, status: "NEW" | "IN_PROGRESS" | "CLOSED") {
  const user = await requireStaff();
  if (!INQUIRY_STATUSES.has(status) || typeof id !== "string") return;
  await db.$transaction(async (tx) => {
    await tx.contactInquiry.update({ where: { id }, data: { status } });
    await audit(tx, { actorId: user.id, action: "inquiry.status", entityType: "inquiry", entityId: id, details: { status } });
  });
  revalidatePath("/admin/inquiries");
}
