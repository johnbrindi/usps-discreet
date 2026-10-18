"use server";

import { after } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { contactLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { contactSchema } from "@/validation/contact";
import { notifyStaff } from "@/server/push";
import { echoValues, type ActionState } from "./types";

export async function submitContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    // A filled honeypot means a bot: respond as if accepted, store nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) {
      return { status: "success", message: "Thanks — your message has been received." };
    }
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: echoValues(formData, ["website"]),
      attempt: Date.now(),
    };
  }

  const ip = await clientIp();
  if (!contactLimiter(`contact:${ip}`).allowed) {
    return {
      status: "error",
      message: "Too many messages from this connection. Please try again later.",
      values: echoValues(formData, ["website"]),
      attempt: Date.now(),
    };
  }

  const { website: _honeypot, trackingNumber, ...data } = parsed.data;
  try {
    const inquiry = await db.contactInquiry.create({
      data: { ...data, trackingNumber: trackingNumber || null },
      select: { id: true },
    });
    logger.info("contact.created", { id: inquiry.id, topic: data.topic });
    after(() =>
      notifyStaff({ title: `New inquiry from ${data.name}`, body: data.message, url: "/admin/inquiries", tag: `inquiry-${inquiry.id}` }),
    );
    return {
      status: "success",
      message: `Thanks — your message has been received. Reference: ${inquiry.id.slice(-8).toUpperCase()}.`,
    };
  } catch (err) {
    logger.error("contact.create_failed", err);
    return {
      status: "error",
      message: "We couldn't send your message right now. Please try again shortly.",
      values: echoValues(formData, ["website"]),
      attempt: Date.now(),
    };
  }
}
