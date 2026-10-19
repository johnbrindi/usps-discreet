"use server";

import { after } from "next/server";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { logger } from "@/lib/logger";

const zipLookupLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

const byAddressSchema = z.object({
  street: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
});

const byZipSchema = z.object({
  zip: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"),
});

export type ZipLookupResult =
  | { kind: "address_result"; zip5: string; zip4?: string; city: string; state: string }
  | { kind: "zip_result"; city: string; state: string; zip: string }
  | { kind: "not_found"; message: string }
  | { kind: "error"; message: string }
  | { kind: "rate_limited" };

/** Look up ZIP+4 from a street address using the Nominatim geocoder (no API key needed). */
export async function lookupZipByAddress(
  _prev: ZipLookupResult | null,
  formData: FormData,
): Promise<ZipLookupResult> {
  const ip = await clientIp();
  if (!zipLookupLimiter(`ziplookup:${ip}`).allowed) return { kind: "rate_limited" };

  const parsed = byAddressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { kind: "error", message: "Please fill in street, city and state." };
  }
  const { street, city, state } = parsed.data;

  try {
    const query = encodeURIComponent(`${street}, ${city}, ${state}, USA`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=1&countrycodes=us`;
    const res = await fetch(url, {
      headers: { "User-Agent": "usps-discreet/1.0 (contact: support@usps-discreet.com)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
    const data = (await res.json()) as Array<{
      address?: {
        postcode?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
      };
    }>;
    const addr = data[0]?.address;
    if (!addr?.postcode) {
      return { kind: "not_found", message: "No ZIP code found for that address. Double-check the street and city." };
    }
    const [zip5, zip4] = (addr.postcode ?? "").split("-");
    const resolvedCity = addr.city ?? addr.town ?? addr.village ?? city;
    const resolvedState = addr.state ?? state;
    logger.info("zip_lookup.address", { city: resolvedCity, state: resolvedState });
    return { kind: "address_result", zip5: zip5 ?? "", zip4, city: resolvedCity, state: resolvedState };
  } catch (err) {
    logger.error("zip_lookup.address_failed", err);
    return { kind: "error", message: "The lookup service is temporarily unavailable. Please try again shortly." };
  }
}

/** Look up city/state from a 5-digit ZIP code. */
export async function lookupCityByZip(
  _prev: ZipLookupResult | null,
  formData: FormData,
): Promise<ZipLookupResult> {
  const ip = await clientIp();
  if (!zipLookupLimiter(`ziplookup:${ip}`).allowed) return { kind: "rate_limited" };

  const parsed = byZipSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { kind: "error", message: parsed.error.issues[0]?.message ?? "Invalid ZIP code." };
  }
  const { zip } = parsed.data;

  try {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&addressdetails=1&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "usps-discreet/1.0 (contact: support@usps-discreet.com)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
    const data = (await res.json()) as Array<{
      address?: { city?: string; town?: string; village?: string; county?: string; state?: string };
    }>;
    const addr = data[0]?.address;
    if (!addr) {
      return { kind: "not_found", message: `No location found for ZIP code ${zip}.` };
    }
    const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
    const state = addr.state ?? "";
    logger.info("zip_lookup.zip", { zip });
    return { kind: "zip_result", city, state, zip };
  } catch (err) {
    logger.error("zip_lookup.zip_failed", err);
    return { kind: "error", message: "The lookup service is temporarily unavailable. Please try again shortly." };
  }
}

/** Fire-and-forget side-effect: run after returning the response. */
export async function zipLookupAfter(fn: () => Promise<void>) {
  after(fn);
}
