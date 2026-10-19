import { z } from "zod";
import { contactSection, type FieldDef, type ToolDef } from "@/config/service-requests";
import { TRACKING_NUMBER_PATTERN, normalizeTrackingNumber } from "@/domain/tracking-number";

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

function fieldSchema(f: FieldDef): z.ZodType {
  let s: z.ZodType;
  switch (f.kind) {
    case "email":
      s = z.email("Enter a valid email address.").trim().max(f.maxLength ?? 254);
      break;
    case "tel":
      s = z
        .string()
        .trim()
        .max(f.maxLength ?? 40)
        .regex(/^[+()\d\s.-]{7,}$/, "Enter a valid phone number.");
      break;
    case "number": {
      let n = z.coerce.number({ error: `Enter a number for ${f.label.toLowerCase()}.` });
      if (f.min !== undefined) n = n.min(f.min, `${f.label} must be at least ${f.min}.`);
      if (f.max !== undefined) n = n.max(f.max, `${f.label} must be ${f.max} or less.`);
      if (f.step === 1) n = n.int(`${f.label} must be a whole number.`);
      s = n;
      break;
    }
    case "date":
      s = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");
      break;
    case "select":
      s = z.enum((f.options ?? []).map((o) => o.value) as [string, ...string[]], { error: `Choose ${f.label.toLowerCase()}.` });
      break;
    case "tracking":
      s = z
        .string()
        .trim()
        .max(60)
        .transform(normalizeTrackingNumber)
        .refine((v) => TRACKING_NUMBER_PATTERN.test(v), "That doesn't look like a tracking number.");
      break;
    default:
      s = z
        .string()
        .trim()
        .min(f.kind === "textarea" ? 10 : 1, f.kind === "textarea" ? "Please add a little more detail." : `Enter ${f.label.toLowerCase()}.`)
        .max(f.maxLength ?? 200, `${f.label} is too long.`);
  }
  if (f.optional) return z.preprocess(emptyToUndefined, s.optional());
  // Required: a blank or missing value gets the field's own message, never zod's generic "expected string".
  const required = f.kind === "select" ? `Choose ${f.label.toLowerCase()}.` : f.kind === "date" ? "Choose a date." : f.kind === "number" ? `Enter a number for ${f.label.toLowerCase()}.` : `Enter ${f.label.toLowerCase()}.`;
  return z.preprocess(emptyToUndefined, z.any().refine((v) => v !== undefined && v !== null, required).pipe(s));
}

/** YYYY-MM-DD for "today" in UTC. */
function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function serviceRequestSchema(tool: ToolDef, now = new Date()) {
  const shape: Record<string, z.ZodType> = {};
  for (const f of [...contactSection.fields, ...tool.sections.flatMap((s) => s.fields)]) shape[f.name] = fieldSchema(f);
  // Honeypot — real users never see or fill this field.
  shape.website = z.string().max(0).optional();

  return z.object(shape).superRefine((v, ctx) => {
    // ─── PICKUP: weekday, tomorrow–30 days ───────────────────────────────
    if (tool.type === "PICKUP" && typeof v.pickupDate === "string") {
      const day = new Date(`${v.pickupDate}T12:00:00Z`);
      const tomorrow = new Date(now.getTime() + 86_400_000);
      const limit = new Date(now.getTime() + 30 * 86_400_000);
      if (Number.isNaN(day.getTime()) || v.pickupDate < isoDay(tomorrow) || v.pickupDate > isoDay(limit)) {
        ctx.addIssue({ code: "custom", path: ["pickupDate"], message: "Choose a date from tomorrow up to 30 days ahead." });
      } else if (day.getUTCDay() === 0 || day.getUTCDay() === 6) {
        ctx.addIssue({ code: "custom", path: ["pickupDate"], message: "Pickups run Monday to Friday." });
      }
    }

    // ─── HOLD_MAIL: end ≥ start, max 30 days ─────────────────────────────
    if (tool.type === "HOLD_MAIL" && typeof v.startDate === "string" && typeof v.endDate === "string") {
      const start = new Date(`${v.startDate}T12:00:00Z`);
      const end = new Date(`${v.endDate}T12:00:00Z`);
      const today = new Date(isoDay(now) + "T12:00:00Z");
      if (start < today) {
        ctx.addIssue({ code: "custom", path: ["startDate"], message: "Start date cannot be in the past." });
      }
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        if (end < start) {
          ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after the start date." });
        } else {
          const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
          if (days > 30) {
            ctx.addIssue({ code: "custom", path: ["endDate"], message: "Hold period cannot exceed 30 days." });
          }
        }
      }
    }

    // ─── REDELIVERY: at least tomorrow ───────────────────────────────────
    if (tool.type === "REDELIVERY" && typeof v.preferredDate === "string") {
      const day = new Date(`${v.preferredDate}T12:00:00Z`);
      const tomorrow = new Date(now.getTime() + 86_400_000);
      if (Number.isNaN(day.getTime()) || v.preferredDate < isoDay(tomorrow)) {
        ctx.addIssue({ code: "custom", path: ["preferredDate"], message: "Choose a date from tomorrow onwards." });
      } else if (day.getUTCDay() === 0 || day.getUTCDay() === 6) {
        ctx.addIssue({ code: "custom", path: ["preferredDate"], message: "Redeliveries run Monday to Friday." });
      }
    }
  });
}

/** Splits validated input into the dedicated columns and the type-specific `details` JSON. */
export function splitServiceRequest(data: Record<string, unknown>) {
  const { name, email, phone, trackingNumber, website: _honeypot, ...details } = data;
  return {
    name: name as string,
    email: email as string,
    phone: (phone as string | undefined) ?? null,
    trackingNumber: (trackingNumber as string | undefined) ?? null,
    details: Object.fromEntries(Object.entries(details).filter(([, val]) => val !== undefined)),
  };
}
