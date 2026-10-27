/**
 * Shipment status model. Mirrors the Prisma `ShipmentStatus` enum but has no runtime
 * dependency on Prisma so it can be shared by client components and unit tests.
 */
export const SHIPMENT_STATUSES = [
  "INFO_RECEIVED",
  "ACCEPTED",
  "IN_TRANSIT",
  "ARRIVED_AT_FACILITY",
  "OUT_FOR_DELIVERY",
  "ON_HOLD",
  "DELIVERED",
  "EXCEPTION",
  "RETURNED_TO_SENDER",
] as const;

/** Choices staff can pick to describe a package and its contents. */
export const PACKAGE_DESCRIPTIONS = ["Discreet"] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export type StatusTone = "neutral" | "info" | "progress" | "success" | "warning" | "danger";

export const STATUS_META: Record<ShipmentStatus, { label: string; summary: string; tone: StatusTone }> = {
  INFO_RECEIVED: {
    label: "Shipment information received",
    summary: "The shipper has created a label. We have not received the parcel yet.",
    tone: "neutral",
  },
  ACCEPTED: { label: "Accepted", summary: "The parcel is in our network.", tone: "info" },
  IN_TRANSIT: { label: "In transit", summary: "The parcel is moving through our network.", tone: "progress" },
  ARRIVED_AT_FACILITY: {
    label: "Arrived at facility",
    summary: "The parcel was scanned at one of our facilities.",
    tone: "progress",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for delivery",
    summary: "The parcel is with a driver for delivery.",
    tone: "info",
  },
  ON_HOLD: {
    label: "On hold",
    summary: "The parcel is being held. See the latest event for details.",
    tone: "warning",
  },
  DELIVERED: { label: "Delivered", summary: "The parcel was delivered.", tone: "success" },
  EXCEPTION: {
    label: "Delivery exception",
    summary: "Something has affected this delivery. See the latest event for details.",
    tone: "warning",
  },
  RETURNED_TO_SENDER: {
    label: "Returned to sender",
    summary: "The parcel is being, or has been, returned to the sender.",
    tone: "danger",
  },
};

/**
 * Staff can record any status at any time, in any order, so every option is always in the
 * dropdown. Statuses the server still treats as final for carrier syncing are listed separately.
 */
export const STATUS_TRANSITIONS: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  INFO_RECEIVED: SHIPMENT_STATUSES,
  ACCEPTED: SHIPMENT_STATUSES,
  IN_TRANSIT: SHIPMENT_STATUSES,
  ARRIVED_AT_FACILITY: SHIPMENT_STATUSES,
  OUT_FOR_DELIVERY: SHIPMENT_STATUSES,
  ON_HOLD: SHIPMENT_STATUSES,
  DELIVERED: SHIPMENT_STATUSES,
  EXCEPTION: SHIPMENT_STATUSES,
  RETURNED_TO_SENDER: SHIPMENT_STATUSES,
};

const TERMINAL: readonly ShipmentStatus[] = ["DELIVERED", "RETURNED_TO_SENDER"];

/** Final statuses: carrier syncing stops once a shipment reaches one. */
export function isTerminal(status: ShipmentStatus) {
  return TERMINAL.includes(status);
}

export function canTransition(from: ShipmentStatus, to: ShipmentStatus) {
  return STATUS_TRANSITIONS[from].includes(to);
}

/** The four milestones shown in the progress bar. Exceptions/returns are shown separately. */
export const MILESTONES = [
  { key: "INFO_RECEIVED", label: "Label created" },
  { key: "IN_TRANSIT", label: "In transit" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
] as const;

const MILESTONE_INDEX: Partial<Record<ShipmentStatus, number>> = {
  INFO_RECEIVED: 0,
  ACCEPTED: 1,
  IN_TRANSIT: 1,
  ARRIVED_AT_FACILITY: 1,
  OUT_FOR_DELIVERY: 2,
  DELIVERED: 3,
};

/**
 * Index of the furthest milestone reached. For exceptions/returns, derive progress
 * from the most recent non-exception event in the history.
 */
export function milestoneIndex(current: ShipmentStatus, history: readonly ShipmentStatus[] = []) {
  const direct = MILESTONE_INDEX[current];
  if (direct !== undefined) return direct;
  let best = 0;
  for (const s of history) best = Math.max(best, MILESTONE_INDEX[s] ?? 0);
  return Math.min(best, 2);
}

/** Statuses an operator may record next: always every status. */
export function nextStatusOptions(current: ShipmentStatus, _hasEvents?: boolean): ShipmentStatus[] {
  return [...STATUS_TRANSITIONS[current]];
}
