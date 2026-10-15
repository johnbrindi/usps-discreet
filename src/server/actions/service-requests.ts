"use server";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { toolBySlug, type ToolDef } from "@/config/service-requests";
import { requireStaff } from "@/lib/authz";
import { db } from "@/lib/db";
import { demoDataEnabled } from "@/lib/env";
import { logger } from "@/lib/logger";
import { serviceRequestLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { audit } from "@/server/audit";
import { serviceRequestSchema, splitServiceRequest } from "@/validation/service-request";
import { echoValues, type ActionState } from "./types";

/** Unambiguous characters only (no 0/O, 1/I/L). */
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function newReference(prefix: string) {
  let s = "";
  for (let i = 0; i < 8; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `${prefix}-${s}`;
}

export type ServiceRequestState = ActionState & { reference?: string };

/** Tools that act on an existing parcel must reference one we actually hold. */
async function checkTrackingNumber(tool: ToolDef, trackingNumber: string | null) {
  if (!trackingNumber || (tool.type !== "ADDRESS_CHANGE" && tool.type !== "CLAIM")) return null;
  const shipment = await db.shipment.findUnique({ where: { trackingNumber }, select: { status: true, isDemo: true } });
  if (!shipment || (shipment.isDemo && !demoDataEnabled())) {
    return "We couldn't find that tracking number. Check it against your receipt or shipping email.";
  }
  if (tool.type === "ADDRESS_CHANGE" && (shipment.status === "DELIVERED" || shipment.status === "RETURNED_TO_SENDER")) {
    return "This parcel has already been delivered or returned, so it can't be redirected.";
  }
  return null;
}

export async function submitServiceRequest(
  slug: string,
  _prev: ServiceRequestState,
  formData: FormData,
): Promise<ServiceRequestState> {
  // Bound arguments come from the client: validate like any other input.
  const tool = typeof slug === "string" ? toolBySlug(slug) : undefined;
  if (!tool) return { status: "error", message: "Unknown request type." };

  const fail = (state: Omit<ServiceRequestState, "status">): ServiceRequestState => ({
    status: "error",
    values: echoValues(formData, ["website"]),
    attempt: Date.now(),
    ...state,
  });

  const parsed = serviceRequestSchema(tool).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    // A filled honeypot means a bot: respond as if accepted, store nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) {
      return { status: "success", reference: newReference(tool.referencePrefix) };
    }
    return fail({ message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const ip = await clientIp();
  if (!serviceRequestLimiter(`svc:${ip}`).allowed) {
    return fail({ message: "Too many requests from this connection. Please try again in a few minutes." });
  }

  const data = splitServiceRequest(parsed.data as Record<string, unknown>);
  try {
    const trackingError = await checkTrackingNumber(tool, data.trackingNumber);
    if (trackingError) return fail({ fieldErrors: { trackingNumber: [trackingError] } });

    for (let attempt = 0; attempt < 3; attempt++) {
      const reference = newReference(tool.referencePrefix);
      try {
        await db.serviceRequest.create({
          data: { ...data, details: data.details as Prisma.InputJsonObject, type: tool.type, reference },
        });
        logger.info("service_request.created", { type: tool.type, reference });
        revalidatePath("/admin/requests");
        return { status: "success", reference };
      } catch (err) {
        // Reference collision (P2002): try a fresh one.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
        throw err;
      }
    }
    throw new Error("Could not allocate a unique reference");
  } catch (err) {
    logger.error("service_request.create_failed", err, { type: tool.type });
    return fail({ message: "We couldn't submit your request right now. Please try again shortly." });
  }
}

const REQUEST_STATUSES = new Set(["NEW", "IN_PROGRESS", "CLOSED"]);

export async function setServiceRequestStatus(id: string, status: "NEW" | "IN_PROGRESS" | "CLOSED") {
  const user = await requireStaff();
  if (!REQUEST_STATUSES.has(status) || typeof id !== "string") return;
  await db.$transaction(async (tx) => {
    await tx.serviceRequest.update({ where: { id }, data: { status } });
    await audit(tx, { actorId: user.id, action: "request.status", entityType: "service_request", entityId: id, details: { status } });
  });
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${id}`);
}
