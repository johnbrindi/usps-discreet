import { z } from "zod";
import { TRACKING_NUMBER_PATTERN, normalizeTrackingNumber } from "@/domain/tracking-number";

export const trackingNumberSchema = z
  .string({ error: "Enter a tracking number." })
  .trim()
  .min(1, "Enter a tracking number.")
  .max(60, "That tracking number is too long.")
  .transform(normalizeTrackingNumber)
  .refine((v) => TRACKING_NUMBER_PATTERN.test(v), {
    message: "Tracking numbers are 10–34 letters and digits. Check the number on your receipt or label.",
  });

export const trackingFormSchema = z.object({ trackingNumber: trackingNumberSchema });
export type TrackingFormInput = z.input<typeof trackingFormSchema>;
