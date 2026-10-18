"use server";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PROVIDER_LABELS, detectCarrier, type CarrierProviderId } from "@/domain/carriers";
import { canTransition } from "@/domain/shipment-status";
import { zonedLocalToUtc } from "@/domain/time";
import { requireStaff } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { audit } from "@/server/audit";
import { configuredProviders } from "@/server/carriers/registry";
import { places } from "@/server/geo/places";
import { syncShipment } from "@/server/tracking/sync";
import { shipmentSchema, trackingEventSchema, trackingSetupSchema } from "@/validation/shipment";
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
  const fields = Object.fromEntries(formData);
  const parsed = shipmentSchema.safeParse(fields);
  const setup = trackingSetupSchema.safeParse(fields);
  if (!parsed.success) return invalid(formData, parsed.error);
  if (!setup.success) return invalid(formData, setup.error);

  const { trackingNumber, estimatedDeliveryDate, ...rest } = parsed.data;
  let carrier: { provider: CarrierProviderId; number: string } | null = null;
  if (setup.data.trackingMode === "CARRIER") {
    const detected = detectCarrier(setup.data.carrierTrackingNumber!);
    const available = configuredProviders();
    const provider =
      setup.data.carrierProvider === "auto"
        ? detected.providers.find((p) => available.includes(p))
        : available.includes(setup.data.carrierProvider)
          ? setup.data.carrierProvider
          : undefined;
    if (!provider) {
      const wanted = setup.data.carrierProvider === "auto" ? detected.providers : [setup.data.carrierProvider];
      return fail(formData, {
        fieldErrors: {
          carrierProvider: [
            `No API credentials are configured for ${wanted.map((p) => PROVIDER_LABELS[p]).join(" or ")}. Add them to the server environment (see docs/integrations.md).`,
          ],
        },
      });
    }
    carrier = { provider, number: detected.trackingNumber };
  }

  let id: string;
  try {
    id = await db.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          ...rest,
          // A carrier-tracked parcel keeps the carrier's number unless staff chose their own.
          trackingNumber: trackingNumber ?? carrier?.number ?? generateTrackingNumber(),
          estimatedDeliveryDate: estimatedDeliveryDate ? new Date(`${estimatedDeliveryDate}T00:00:00Z`) : null,
          ...(carrier && {
            trackingMode: "CARRIER" as const,
            carrierProvider: carrier.provider,
            carrierTrackingNumber: carrier.number,
            nextSyncAt: new Date(),
          }),
        },
        select: { id: true, trackingNumber: true },
      });
      await audit(tx, {
        actorId: user.id,
        action: "shipment.create",
        entityType: "shipment",
        entityId: shipment.id,
        details: { trackingNumber: shipment.trackingNumber, ...(carrier && { carrierProvider: carrier.provider }) },
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
  if (carrier) {
    // First pull straight away so staff see real carrier data on the next screen. A slow or failed
    // call is fine: it's logged on the shipment and the scheduler retries.
    const first = syncShipment(id, "create", { force: true }).catch((err) => logger.error("shipment.initial_sync_failed", err, { id }));
    await Promise.race([first, new Promise((r) => setTimeout(r, 10_000))]);
  }
  revalidatePath("/admin/shipments");
  redirect(`/admin/shipments/${id}?created=1`);
}

export async function updateShipment(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = shipmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);

  // Tracking numbers are immutable once issued.
  const { trackingNumber: _ignored, estimatedDeliveryDate, estimateSource, ...rest } = parsed.data;
  // Carrier-tracked forms don't show the estimate fields: the carrier owns them, so leave them untouched.
  const estimate = formData.has("estimatedDeliveryDate")
    ? { estimatedDeliveryDate: estimatedDeliveryDate ? new Date(`${estimatedDeliveryDate}T00:00:00Z`) : null, estimateSource }
    : {};
  try {
    await db.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id },
        data: { ...rest, ...estimate },
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
  // A blank time zone is taken from the scan's city, so local times are right without typing one.
  const timeZone = input.timeZone || places().lookup(input)?.timeZone || null;
  const occurredAt = zonedLocalToUtc(input.occurredAt, timeZone);

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
          trackingMode: true,
          events: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } },
        },
      });
      if (!shipment) return { error: "Shipment not found." };
      if (shipment.trackingMode === "CARRIER") {
        return { error: "This shipment is tracked by the carrier's API. Its events can't be added by hand." };
      }
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
          timeZone,
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

/** The time zone of a city, for the event form to fill in as staff type the location. */
export async function suggestTimeZone(place: { city?: string; region?: string; country?: string }): Promise<string | null> {
  await requireStaff();
  const clip = (v?: string) => (typeof v === "string" ? v.slice(0, 120) : undefined);
  return places().lookup({ city: clip(place.city), region: clip(place.region), country: clip(place.country) })?.timeZone ?? null;
}

/** Removes the most recent event (to correct a mistake) and restores the previous status. */
export async function removeLatestEvent(shipmentId: string): Promise<void> {
  const user = await requireStaff();
  await db.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({ where: { id: shipmentId }, select: { trackingMode: true } });
    // Carrier events are the carrier's record; the next sync would restore them anyway.
    if (!shipment || shipment.trackingMode === "CARRIER") return;
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

/** "Sync now" on a carrier-tracked shipment. Bypasses the schedule but not the concurrency lease. */
export async function syncShipmentNow(shipmentId: string, _prev: ActionState): Promise<ActionState> {
  const user = await requireStaff();
  let message: string;
  let ok = false;
  try {
    const r = await syncShipment(shipmentId, "manual", { force: true });
    ok = r.outcome === "ok";
    message =
      r.outcome === "ok"
        ? `Synced. ${r.eventsAdded} new event${r.eventsAdded === 1 ? "" : "s"}${r.eventsRemoved ? `, ${r.eventsRemoved} removed` : ""}.`
        : r.outcome === "skipped"
          ? "A sync is already running for this shipment. Try again in a minute."
          : `Carrier sync failed (${r.outcome.replace("_", " ")}): ${r.error ?? "see the sync log."}`;
    await db.$transaction((tx) =>
      audit(tx, { actorId: user.id, action: "shipment.sync", entityType: "shipment", entityId: shipmentId, details: { outcome: r.outcome } }),
    );
  } catch (err) {
    logger.error("shipment.manual_sync_failed", err, { shipmentId });
    message = "Could not run the sync. Please try again.";
  }
  revalidatePath(`/admin/shipments/${shipmentId}`);
  return { status: ok ? "success" : "error", message, attempt: Date.now() };
}
