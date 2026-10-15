import { describe, expect, it } from "vitest";
import {
  formatTrackingNumber,
  isValidTrackingNumber,
  normalizeTrackingNumber,
  splitTrackingNumbers,
} from "@/domain/tracking-number";
import { trackingNumberSchema } from "@/validation/tracking";

describe("tracking numbers", () => {
  it("normalizes spaces, dashes and case", () => {
    expect(normalizeTrackingNumber(" mp12-3456 7890 ab ")).toBe("MP1234567890AB");
  });

  it("validates length and characters", () => {
    expect(isValidTrackingNumber("DEMO00000000000001")).toBe(true);
    expect(isValidTrackingNumber("123")).toBe(false);
    expect(isValidTrackingNumber("A".repeat(35))).toBe(false);
    expect(isValidTrackingNumber("MP12345678<script>")).toBe(false);
    expect(isValidTrackingNumber("MP1234567890'; DROP")).toBe(false);
  });

  it("formats in groups of four for display", () => {
    expect(formatTrackingNumber("MP1234567890")).toBe("MP12 3456 7890");
  });

  it("splits and de-duplicates multiple numbers", () => {
    expect(splitTrackingNumbers("abc1234567, ABC1234567\nzz99999999")).toEqual(["ABC1234567", "ZZ99999999"]);
  });

  it("schema returns the normalized value or a friendly message", () => {
    expect(trackingNumberSchema.parse("demo 0000 0000 0000 01")).toBe("DEMO00000000000001");
    const empty = trackingNumberSchema.safeParse("   ");
    expect(empty.success).toBe(false);
    expect(empty.error?.issues[0]?.message).toBe("Enter a tracking number.");
    expect(trackingNumberSchema.safeParse("x".repeat(61)).success).toBe(false);
  });
});
