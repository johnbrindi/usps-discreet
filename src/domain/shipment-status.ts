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

/** Allowed next statuses. Repeating a scan of the same status (e.g. another facility) is allowed where listed. */
export const STATUS_TRANSITIONS: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  INFO_RECEIVED: ["ACCEPTED", "EXCEPTION"],
  ACCEPTED: ["IN_TRANSIT", "ARRIVED_AT_FACILITY", "ON_HOLD", "EXCEPTION"],
  IN_TRANSIT: ["IN_TRANSIT", "ARRIVED_AT_FACILITY", "OUT_FOR_DELIVERY", "ON_HOLD", "EXCEPTION", "RETURNED_TO_SENDER"],
  ARRIVED_AT_FACILITY: [
    "ARRIVED_AT_FACILITY",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "ON_HOLD",
    "EXCEPTION",
    "RETURNED_TO_SENDER",
  ],
  OUT_FOR_DELIVERY: ["DELIVERED", "ON_HOLD", "EXCEPTION", "ARRIVED_AT_FACILITY"],
  ON_HOLD: ["ON_HOLD", "IN_TRANSIT", "ARRIVED_AT_FACILITY", "OUT_FOR_DELIVERY", "EXCEPTION", "RETURNED_TO_SENDER"],
  EXCEPTION: ["EXCEPTION", "IN_TRANSIT", "ARRIVED_AT_FACILITY", "OUT_FOR_DELIVERY", "ON_HOLD", "RETURNED_TO_SENDER"],
  DELIVERED: [],
  RETURNED_TO_SENDER: [],
};

export function isTerminal(status: ShipmentStatus) {
  return STATUS_TRANSITIONS[status].length === 0;
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

/** Statuses an operator may record next. A shipment with no events starts at "label created". */
export function nextStatusOptions(current: ShipmentStatus, hasEvents: boolean): ShipmentStatus[] {
  return hasEvents ? [...STATUS_TRANSITIONS[current]] : ["INFO_RECEIVED", ...STATUS_TRANSITIONS.INFO_RECEIVED];
}
