import type { ShipmentStatus } from "./shipment-status";

/**
 * Carrier APIs the app can query. `ship24` is an aggregator covering 1,500+ carriers (UPS, FedEx,
 * Royal Mail, national posts, …) and is the fallback for anything not handled by a direct integration.
 */
export const CARRIER_PROVIDERS = ["usps", "dhl", "ship24"] as const;
export type CarrierProviderId = (typeof CARRIER_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<CarrierProviderId, string> = {
  usps: "USPS",
  dhl: "DHL",
  ship24: "Ship24 (any carrier)",
};

export type CarrierDetection = {
  /** Best guess at who issued the number, for display. null when unknown. */
  carrier: string | null;
  /** The number to send to the carrier (e.g. USPS "420+ZIP" routing prefixes stripped). */
  trackingNumber: string;
  /** Providers to try, most specific first. */
  providers: CarrierProviderId[];
};

/** UPU S10 check digit (international postal items, e.g. "EA123456789US"). */
export function s10CheckDigit(serial8: string) {
  const weights = [8, 6, 4, 2, 3, 5, 9, 7];
  const sum = [...serial8].reduce((acc, d, i) => acc + Number(d) * weights[i]!, 0);
  const c = 11 - (sum % 11);
  return c === 10 ? 0 : c === 11 ? 5 : c;
}

function isValidS10(n: string) {
  const m = /^[A-Z]{2}(\d{8})(\d)[A-Z]{2}$/.exec(n);
  return !!m && s10CheckDigit(m[1]!) === Number(m[2]);
}

/**
 * Identifies the likely carrier from the number's format. Formats are published by each carrier
 * (USPS Pub 199 IMpb, UPU S10, UPS 1Z, DHL Express/eCommerce). Detection only orders the providers
 * to try — the carrier API is always the authority on whether a number exists.
 */
export function detectCarrier(normalized: string): CarrierDetection {
  const n = normalized;

  // USPS label with a "420" + ZIP5/ZIP9 routing prefix in front of the IMpb.
  const routed = /^420(?:\d{5}|\d{9})(9[1-5]\d{18,20})$/.exec(n);
  if (routed) return { carrier: "USPS", trackingNumber: routed[1]!, providers: ["usps", "ship24"] };
  // USPS IMpb (Intelligent Mail package barcode): 20–22 digits beginning 91–95.
  if (/^9[1-5]\d{18,20}$/.test(n)) return { carrier: "USPS", trackingNumber: n, providers: ["usps", "ship24"] };

  if (isValidS10(n)) {
    if (n.endsWith("US")) return { carrier: "USPS", trackingNumber: n, providers: ["usps", "ship24"] };
    return { carrier: null, trackingNumber: n, providers: ["ship24"] };
  }

  if (/^1Z[0-9A-Z]{16}$/.test(n)) return { carrier: "UPS", trackingNumber: n, providers: ["ship24"] };

  // DHL Express waybills (10 digits), DHL Parcel/eCommerce (JJD…, JVGL…, GM…, 3S…).
  if (/^\d{10}$/.test(n) || /^(JJD|JVGL)\d{8,}$/.test(n) || /^GM\d{16,18}$/.test(n) || /^3S[A-Z0-9]{8,}$/.test(n)) {
    return { carrier: "DHL", trackingNumber: n, providers: ["dhl", "ship24"] };
  }

  // FedEx: 12, 15 or 20-digit (96…) numbers. Format overlaps others, so it's a hint only.
  if (/^(\d{12}|\d{15}|96\d{18})$/.test(n)) return { carrier: "FedEx", trackingNumber: n, providers: ["ship24"] };

  return { carrier: null, trackingNumber: n, providers: ["ship24"] };
}

/**
 * Maps a carrier's free-text event/status wording to our lifecycle. Used where the carrier has no
 * structured code (or as a refinement of a coarse one). Order matters: negatives before positives.
 */
export function statusFromCarrierText(text: string, fallback: ShipmentStatus = "IN_TRANSIT"): ShipmentStatus {
  const t = text.toLowerCase();
  if (/return(ed|ing)? to (the )?(sender|shipper)|return to sender/.test(t)) return "RETURNED_TO_SENDER";
  if (/undeliverable|not delivered|cancell?ed|delivery attempt|attempted|notice left|refused|unclaimed|no access|insufficient address|exception|delay|alert|held|on hold|customs (clearance )?(delay|hold)|damaged|failed|missed/.test(t)) {
    return "EXCEPTION";
  }
  if (/\bdelivered\b/.test(t)) return "DELIVERED";
  if (/out for delivery|with (the )?(courier|driver) for delivery|on vehicle for delivery/.test(t)) return "OUT_FOR_DELIVERY";
  if (/label created|pre-?shipment|shipping label|shipment information received|electronic(ally)? (notified|submitted)|awaiting item|info(rmation)? received|data received/.test(t)) {
    return "INFO_RECEIVED";
  }
  if (/accepted|acceptance|picked up|pickup completed|collected|posted|drop(ped)? off/.test(t)) return "ACCEPTED";
  if (/arrived|arrival|available for pick ?up|ready for pick ?up|at (the )?(facility|hub|post office|depot)/.test(t)) {
    return "ARRIVED_AT_FACILITY";
  }
  return fallback;
}
