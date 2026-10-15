import { describe, expect, it } from "vitest";
import { formatEventTime, zonedLocalToUtc } from "@/domain/time";
import { createRateLimiter } from "@/lib/rate-limit";
import { isWithinSupportHours } from "@/lib/support-hours";

describe("time zones", () => {
  it("interprets wall-clock time in the event's zone (DST and standard time)", () => {
    expect(zonedLocalToUtc("2026-07-01T09:00", "America/Chicago").toISOString()).toBe("2026-07-01T14:00:00.000Z");
    expect(zonedLocalToUtc("2026-12-01T09:00", "America/Chicago").toISOString()).toBe("2026-12-01T15:00:00.000Z");
    expect(zonedLocalToUtc("2026-12-01T09:00", null).toISOString()).toBe("2026-12-01T09:00:00.000Z");
  });

  it("formats times with a zone abbreviation", () => {
    const t = formatEventTime("2026-07-01T14:00:00.000Z", "America/Chicago");
    expect(t.date).toBe("Jul 1, 2026");
    expect(t.time).toMatch(/9:00\s?AM CDT/);
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and resets after the window", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(check("ip", 0).allowed).toBe(true);
    expect(check("ip", 1).allowed).toBe(true);
    expect(check("ip", 2).allowed).toBe(false);
    expect(check("other", 2).allowed).toBe(true);
    expect(check("ip", 1001).allowed).toBe(true);
  });

  it("bounds memory use", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 3 });
    for (let i = 0; i < 10; i++) check(`k${i}`, 0);
    expect(check("k9", 0).allowed).toBe(false);
  });
});

describe("support hours", () => {
  const hours = { timeZone: "America/New_York", days: [1, 2, 3, 4, 5], openHour: 8, closeHour: 18 };
  it("is open on a weekday afternoon in New York", () => {
    expect(isWithinSupportHours(new Date("2026-10-14T16:00:00Z"), hours)).toBe(true); // Wed 12:00 EDT
  });
  it("is closed at night and on weekends", () => {
    expect(isWithinSupportHours(new Date("2026-10-14T03:00:00Z"), hours)).toBe(false); // Tue 23:00 EDT
    expect(isWithinSupportHours(new Date("2026-10-17T16:00:00Z"), hours)).toBe(false); // Sat
  });
});
