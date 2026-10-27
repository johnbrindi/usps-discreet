import { describe, expect, it } from "vitest";
import { contactSchema } from "@/validation/contact";
import { shipmentSchema, trackingEventSchema } from "@/validation/shipment";

const contact = { name: "Ada Lovelace", email: "ada@example.com", topic: "tracking", message: "Where is my parcel please?" };

describe("contact form validation", () => {
  it("accepts a valid message", () => {
    expect(contactSchema.safeParse(contact).success).toBe(true);
  });
  it("rejects a filled honeypot", () => {
    expect(contactSchema.safeParse({ ...contact, website: "http://spam" }).success).toBe(false);
  });
  it("rejects bad email, short message and unknown topics", () => {
    expect(contactSchema.safeParse({ ...contact, email: "nope" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...contact, message: "hi" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...contact, topic: "refund-me" }).success).toBe(false);
  });
  it("accepts an empty optional tracking number but rejects malformed ones", () => {
    expect(contactSchema.safeParse({ ...contact, trackingNumber: "" }).success).toBe(true);
    expect(contactSchema.safeParse({ ...contact, trackingNumber: "bad!" }).success).toBe(false);
  });
});

describe("shipment validation", () => {
  it("requires a source when an estimated delivery date is given", () => {
    expect(shipmentSchema.safeParse({ estimatedDeliveryDate: "2026-10-20" }).success).toBe(false);
    expect(shipmentSchema.safeParse({ estimatedDeliveryDate: "2026-10-20", estimateSource: "Carrier API" }).success).toBe(true);
  });
  it("accepts country names and 2- or 3-letter codes, stored as the 2-letter code", () => {
    expect(shipmentSchema.parse({ originCountry: "us" }).originCountry).toBe("US");
    expect(shipmentSchema.parse({ originCountry: "USA" }).originCountry).toBe("US");
    expect(shipmentSchema.parse({ originCountry: "United Arab Emirates" }).originCountry).toBe("AE");
    expect(shipmentSchema.safeParse({ originCountry: "Ajman" }).success).toBe(false);
  });
  it("converts blank optional fields to null", () => {
    expect(shipmentSchema.parse({ originCity: "" }).originCity).toBeNull();
  });
});

describe("tracking event validation", () => {
  const ev = { status: "IN_TRANSIT", description: "Departed facility", occurredAt: "2026-10-14T09:30" };
  it("accepts a valid event", () => {
    expect(trackingEventSchema.safeParse(ev).success).toBe(true);
  });
  it("rejects unknown statuses and invalid time zones", () => {
    expect(trackingEventSchema.safeParse({ ...ev, status: "TELEPORTED" }).success).toBe(false);
    expect(trackingEventSchema.safeParse({ ...ev, timeZone: "Mars/Olympus" }).success).toBe(false);
    expect(trackingEventSchema.safeParse({ ...ev, timeZone: "America/Chicago" }).success).toBe(true);
  });
});
