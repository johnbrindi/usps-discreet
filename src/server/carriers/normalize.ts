import { createHash } from "node:crypto";
import type { CarrierEvent } from "./types";

/** Trims, collapses whitespace, strips control characters and caps length. Empty → null. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return v ? v.slice(0, max) : null;
}

export function countryCode(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (/^[A-Z]{2}$/.test(v)) return v;
  if (v === "UNITED STATES" || v === "USA" || v === "UNITED STATES OF AMERICA") return "US";
  return null;
}

const US_STATES = new Set(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA PR RI SC SD TN TX UT VT VA WA WV WI WY".split(" "),
);

/**
 * Title-cases carrier SHOUTING ("SAN FRANCISCO" → "San Francisco") while keeping state codes and
 * acronyms such as "TX" or "USPS" in capitals. Mixed-case input is left alone.
 */
export function tidyPlace(value: unknown, max = 120): string | null {
  const v = cleanText(value, max);
  if (!v || v !== v.toUpperCase()) return v;
  return v.replace(/\p{L}+/gu, (w) => (US_STATES.has(w) || w === "USPS" || w === "DHL" || w === "UPS" ? w : w[0] + w.slice(1).toLowerCase()));
}

/**
 * Parses a carrier timestamp. Returns the instant plus the UTC offset it was written in (used to show
 * the scan in local time). Timestamps without an offset are taken as UTC, with no zone claimed.
 */
export function parseCarrierTime(value: unknown, explicitOffset?: string | null): { at: Date; timeZone: string | null } | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const v = value.trim();
  const offsetInValue = /(Z|[+-]\d{2}:?\d{2})$/i.exec(v)?.[1];
  const offset = normalizeOffset(explicitOffset) ?? (offsetInValue && offsetInValue.toUpperCase() !== "Z" ? normalizeOffset(offsetInValue) : null);
  const iso = offsetInValue ? v : `${v}${offset ?? "Z"}`;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return { at, timeZone: offset };
}

function normalizeOffset(value: string | null | undefined): string | null {
  const m = typeof value === "string" ? /^([+-])(\d{2}):?(\d{2})$/.exec(value.trim()) : null;
  return m ? `${m[1]}${m[2]}:${m[3]}` : null;
}

/** Stable id for carriers that don't provide one: same scan → same id across syncs. */
export function eventHash(provider: string, parts: Array<string | null | undefined>) {
  return `${provider}:${createHash("sha256").update(parts.map((p) => p ?? "").join("\u001f")).digest("hex").slice(0, 40)}`;
}

/** Newest first, de-duplicated by externalId (carriers occasionally repeat a scan verbatim). */
export function sortAndDedupe(events: CarrierEvent[]) {
  const seen = new Set<string>();
  return events
    .filter((e) => (seen.has(e.externalId) ? false : (seen.add(e.externalId), true)))
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

export function dateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return m ? m[1]! : null;
}
