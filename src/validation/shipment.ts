import { z } from "zod";
import { CARRIER_PROVIDERS } from "@/domain/carriers";
import { SHIPMENT_STATUSES } from "@/domain/shipment-status";
import { trackingNumberSchema } from "./tracking";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const country = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "Use a two-letter country code.")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const shipmentSchema = z
  .object({
    trackingNumber: trackingNumberSchema.optional().or(z.literal("").transform(() => undefined)),
    serviceLevel: optionalText(80),
    carrier: optionalText(80),
    externalReference: optionalText(120),
    originCity: optionalText(120),
    originRegion: optionalText(120),
    originCountry: country,
    destinationCity: optionalText(120),
    destinationRegion: optionalText(120),
    destinationCountry: country,
    destinationPostcode: optionalText(20),
    recipientName: optionalText(160),
    internalNotes: optionalText(4000),
    estimatedDeliveryDate: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date.")
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    estimateSource: optionalText(120),
  })
  .refine((d) => !d.estimatedDeliveryDate || !!d.estimateSource, {
    path: ["estimateSource"],
    message: "Say where the estimate comes from (e.g. carrier API, service standard).",
  });

/** Create-only fields choosing how the shipment is tracked. Fixed after creation. */
export const trackingSetupSchema = z
  .object({
    trackingMode: z.enum(["MANUAL", "CARRIER"]).default("MANUAL"),
    carrierProvider: z.enum(["auto", ...CARRIER_PROVIDERS]).default("auto"),
    carrierTrackingNumber: trackingNumberSchema.optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((d) => d.trackingMode === "MANUAL" || !!d.carrierTrackingNumber, {
    path: ["carrierTrackingNumber"],
    message: "Enter the number printed on the carrier's label.",
  });

export const trackingEventSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES),
  description: z.string().trim().min(3, "Describe the event.").max(280),
  city: optionalText(120),
  region: optionalText(120),
  country,
  timeZone: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidTimeZone(v), "Use an IANA time zone such as America/Chicago.")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  occurredAt: z
    .string()
    .trim()
    .min(1, "Enter when the event happened.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date and time."),
});

export type ShipmentInput = z.input<typeof shipmentSchema>;
export type TrackingEventInput = z.input<typeof trackingEventSchema>;
