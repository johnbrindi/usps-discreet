"use server";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canTransition } from "@/domain/shipment-status";
import { zonedLocalToUtc } from "@/domain/time";
import { requireStaff } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { audit } from "@/server/audit";
import { shipmentSchema, trackingEventSchema } from "@/validation/shipment";
import { echoValues, type ActionState } from "./types";

const PREFIX = (process.env.TRACKING_NUMBER_PREFIX || "MP").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);

/** 20 random digits — ~66 bits of entropy, so numbers can't practically be enumerated. */
function generateTrackingNumber() {
  let digits = "";
  for (let i = 0; i < 20; i++) digits += randomInt(10).toString();
  return `${PREFIX}${digits}`;
}

/** Error result that keeps the operator's input in the form. */
function fail(formData: FormData, state: Omit<ActionState, "status">): ActionState {
  return { status: "error", values: echoValues(formData), attempt: Date.now(), ...state };
}

function invalid(formData: FormData, error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  return fail(formData, { message: "Please fix the highlighted fields.", fieldErrors: error.flatten().fieldErrors });
}

export async function createShipment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = shipmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);

  const { trackingNumber, estimatedDeliveryDate, ...rest } = parsed.data;
  let id: string;
  try {
    id = await db.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          ...rest,
          trackingNumber: trackingNumber ?? generateTrackingNumber(),
          estimatedDeliveryDate: estimatedDeliveryDate ? new Date(`${estimatedDeliveryDate}T00:00:00Z`) : null,
        },
        select: { id: true, trackingNumber: true },
      });
      await audit(tx, {
        actorId: user.id,
        action: "shipment.create",
        entityType: "shipment",
        entityId: shipment.id,
        details: { trackingNumber: shipment.trackingNumber },
      });
      return shipment.id;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail(formData, { fieldErrors: { trackingNumber: ["That tracking number already exists."] } });
    }
    logger.error("shipment.create_failed", err);
    return fail(formData, { message: "Could not create the shipment. Please try again." });
  }
  revalidatePath("/admin/shipments");
  redirect(`/admin/shipments/${id}?created=1`);
}

export async function updateShipment(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = shipmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);

  // Tracking numbers are immutable once issued.
  const { trackingNumber: _ignored, estimatedDeliveryDate, ...rest } = parsed.data;
  try {
    await db.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id },
        data: {
          ...rest,
          estimatedDeliveryDate: estimatedDeliveryDate ? new Date(`${estimatedDeliveryDate}T00:00:00Z`) : null,
        },
      });
      await audit(tx, {
        actorId: user.id,
        action: "shipment.update",
        entityType: "shipment",
        entityId: id,
        details: { fields: Object.keys(rest).filter((k) => k !== "recipientName" && k !== "internalNotes") },
      });
    });
  } catch (err) {
    logger.error("shipment.update_failed", err, { id });
    return fail(formData, { message: "Could not save changes." });
  }
  revalidatePath(`/admin/shipments/${id}`);
  return { status: "success", message: "Shipment details saved." };
}

export async function addTrackingEvent(
  shipmentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = trackingEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const input = parsed.data;
  const occurredAt = zonedLocalToUtc(input.occurredAt, input.timeZone);

  if (occurredAt.getTime() > Date.now() + 5 * 60_000) {
    return fail(formData, { fieldErrors: { occurredAt: ["Events can't be recorded in the future."] } });
  }

  try {
    const outcome = await db.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
        select: {
          status: true,
          isDemo: true,
          events: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } },
        },
      });
      if (!shipment) return { error: "Shipment not found." };
      const latest = shipment.events[0];
      const allowed = latest
        ? canTransition(shipment.status, input.status)
        : input.status === "INFO_RECEIVED" || canTransition("INFO_RECEIVED", input.status);
      if (!allowed) return { error: `A shipment that is "${shipment.status}" can't move to "${input.status}".` };
      if (latest && occurredAt < latest.occurredAt) {
        return { error: "This event is earlier than the latest recorded event. Events must be added in order." };
      }

      await tx.trackingEvent.create({
        data: {
          shipmentId,
          status: input.status,
          description: input.description,
          city: input.city,
          region: input.region,
          country: input.country,
          timeZone: input.timeZone,
          occurredAt,
          source: shipment.isDemo ? "DEMO" : "MANUAL",
          createdById: user.id,
        },
      });
      await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: input.status, deliveredAt: input.status === "DELIVERED" ? occurredAt : undefined },
      });
      await audit(tx, {
        actorId: user.id,
        action: "event.create",
        entityType: "shipment",
        entityId: shipmentId,
        details: { status: input.status },
      });
      return { error: null };
    });
    if (outcome.error) return fail(formData, { message: outcome.error });
  } catch (err) {
    logger.error("event.create_failed", err, { shipmentId });
    return fail(formData, { message: "Could not record the event." });
  }
  revalidatePath(`/admin/shipments/${shipmentId}`);
  return { status: "success", message: "Event recorded.", attempt: Date.now() };
}

/** Removes the most recent event (to correct a mistake) and restores the previous status. */
export async function removeLatestEvent(shipmentId: string): Promise<void> {
  const user = await requireStaff();
  await db.$transaction(async (tx) => {
    const events = await tx.trackingEvent.findMany({
      where: { shipmentId },
      orderBy: { occurredAt: "desc" },
      take: 2,
      select: { id: true, status: true },
    });
    const [latest, previous] = events;
    if (!latest) return;
    await tx.trackingEvent.delete({ where: { id: latest.id } });
    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        status: previous?.status ?? "INFO_RECEIVED",
        ...(latest.status === "DELIVERED" ? { deliveredAt: null } : {}),
      },
    });
    await audit(tx, {
      actorId: user.id,
      action: "event.delete",
      entityType: "shipment",
      entityId: shipmentId,
      details: { removedStatus: latest.status },
    });
  });
  revalidatePath(`/admin/shipments/${shipmentId}`);
}
