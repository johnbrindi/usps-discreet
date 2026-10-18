import { describe, expect, it } from "vitest";
import { toolBySlug } from "@/config/service-requests";
import { serviceRequestSchema, splitServiceRequest } from "@/validation/service-request";

// Wednesday 2026-10-14, midday UTC.
const NOW = new Date("2026-10-14T12:00:00Z");
const contact = { name: "Ada Lovelace", email: "ada@example.com", phone: "" };
const address = (p: string) => ({
  [`${p}Line1`]: "1 Main St",
  [`${p}Line2`]: "",
  [`${p}City`]: "Austin",
  [`${p}Region`]: "TX",
  [`${p}Postcode`]: "78701",
  [`${p}Country`]: "United States",
});
const pickup = {
  ...contact,
  ...address("pickup"),
  pickupDate: "2026-10-15",
  timeWindow: "morning",
  parcelCount: "2",
  totalWeight: "3.5",
  weightUnit: "kg",
  instructions: "",
};
const parse = (slug: string, input: Record<string, string>) => serviceRequestSchema(toolBySlug(slug)!, NOW).safeParse(input);

describe("service request validation", () => {
  it("accepts a valid pickup and coerces numbers", () => {
    const r = parse("pickup", pickup);
    expect(r.success).toBe(true);
    expect(r.data?.parcelCount).toBe(2);
    expect(r.data?.instructions).toBeUndefined();
  });

  it("names the field when a required value is blank or missing", () => {
    const errors = (input: Record<string, string>) => parse("pickup", input).error?.flatten().fieldErrors as Record<string, string[]>;
    const blank = errors({ ...pickup, pickupCity: "  ", parcelCount: "", timeWindow: "", pickupDate: "" });
    expect(blank.pickupCity).toEqual(["Enter city."]);
    expect(blank.parcelCount).toEqual(["Enter a number for number of parcels."]);
    expect(blank.timeWindow).toEqual(["Choose time window."]);
    expect(blank.pickupDate).toEqual(["Choose a date."]);
    const missing: Record<string, string> = { ...pickup };
    delete missing.pickupLine1;
    expect(errors(missing).pickupLine1).toEqual(["Enter street address."]);
    // No zod internals ever reach the customer.
    expect(JSON.stringify(errors({}))).not.toMatch(/Invalid input|expected/);
  });

  it("rejects pickups today, on weekends, or more than 30 days out", () => {
    for (const pickupDate of ["2026-10-14", "2026-10-17", "2026-11-20"]) {
      const r = parse("pickup", { ...pickup, pickupDate });
      expect(r.success, pickupDate).toBe(false);
      expect(r.error?.issues.some((i) => i.path[0] === "pickupDate"), pickupDate).toBe(true);
    }
  });

  it("rejects a fractional parcel count and unknown select values", () => {
    expect(parse("pickup", { ...pickup, parcelCount: "1.5" }).success).toBe(false);
    expect(parse("pickup", { ...pickup, timeWindow: "midnight" }).success).toBe(false);
  });

  it("normalizes tracking numbers on claims and rejects malformed ones", () => {
    const claim = {
      ...contact,
      trackingNumber: "mp 1234-5678 9012",
      claimType: "damaged",
      itemDescription: "Ceramic vase",
      declaredValue: "80",
      incidentDetails: "Box was crushed and the vase is broken.",
    };
    const ok = parse("claim", claim);
    expect(ok.success).toBe(true);
    expect(ok.data?.trackingNumber).toBe("MP123456789012");
    expect(parse("claim", { ...claim, trackingNumber: "abc" }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    const r = parse("pickup", { ...pickup, website: "http://spam" });
    expect(r.error?.issues.some((i) => i.path[0] === "website")).toBe(true);
  });

  it("splits contact columns from type-specific details", () => {
    const r = parse("pickup", pickup);
    const split = splitServiceRequest(r.data as Record<string, unknown>);
    expect(split).toMatchObject({ name: "Ada Lovelace", email: "ada@example.com", phone: null, trackingNumber: null });
    expect(split.details).not.toHaveProperty("name");
    expect(split.details).not.toHaveProperty("instructions");
    expect(split.details).toMatchObject({ pickupCity: "Austin", parcelCount: 2 });
  });
});
