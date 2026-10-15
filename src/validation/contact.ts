import { z } from "zod";
import { TRACKING_NUMBER_PATTERN, normalizeTrackingNumber } from "@/domain/tracking-number";

export const CONTACT_TOPICS = [
  { value: "tracking", label: "Tracking question" },
  { value: "delivery", label: "Delivery problem" },
  { value: "damage", label: "Damaged or missing item" },
  { value: "other", label: "Something else" },
] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120, "Name is too long."),
  email: z.email("Enter a valid email address.").trim().max(254),
  topic: z.enum(CONTACT_TOPICS.map((t) => t.value) as [string, ...string[]], { error: "Choose a topic." }),
  trackingNumber: z
    .string()
    .trim()
    .max(60)
    .transform(normalizeTrackingNumber)
    .refine((v) => v === "" || TRACKING_NUMBER_PATTERN.test(v), "That doesn't look like a tracking number.")
    .optional(),
  message: z
    .string()
    .trim()
    .min(10, "Please add a little more detail (at least 10 characters).")
    .max(4000, "Message is too long (4,000 characters max)."),
  // Honeypot — real users never see or fill this field.
  website: z.string().max(0).optional(),
});

export type ContactInput = z.input<typeof contactSchema>;
