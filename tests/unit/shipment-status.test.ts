import { describe, expect, it } from "vitest";
import {
  SHIPMENT_STATUSES,
  STATUS_META,
  STATUS_TRANSITIONS,
  canTransition,
  isTerminal,
  milestoneIndex,
  nextStatusOptions,
} from "@/domain/shipment-status";

describe("shipment status model", () => {
  it("has metadata and a transition list for every status", () => {
    for (const s of SHIPMENT_STATUSES) {
      expect(STATUS_META[s].label).toBeTruthy();
      expect(Array.isArray(STATUS_TRANSITIONS[s])).toBe(true);
    }
  });

  it("only references known statuses in transitions", () => {
    for (const targets of Object.values(STATUS_TRANSITIONS)) {
      for (const t of targets) expect(SHIPMENT_STATUSES).toContain(t);
    }
  });

  it("treats delivered and returned as terminal", () => {
    expect(isTerminal("DELIVERED")).toBe(true);
    expect(isTerminal("RETURNED_TO_SENDER")).toBe(true);
    expect(isTerminal("IN_TRANSIT")).toBe(false);
  });

  it("lets staff pick any status from any status", () => {
    for (const from of SHIPMENT_STATUSES) {
      for (const to of SHIPMENT_STATUSES) expect(canTransition(from, to)).toBe(true);
      expect(nextStatusOptions(from, true)).toEqual([...SHIPMENT_STATUSES]);
    }
    expect(nextStatusOptions("INFO_RECEIVED", false)).toEqual([...SHIPMENT_STATUSES]);
  });

  it("computes milestone progress, including for exceptions", () => {
    expect(milestoneIndex("INFO_RECEIVED")).toBe(0);
    expect(milestoneIndex("ARRIVED_AT_FACILITY")).toBe(1);
    expect(milestoneIndex("DELIVERED")).toBe(3);
    expect(milestoneIndex("EXCEPTION", ["OUT_FOR_DELIVERY", "IN_TRANSIT"])).toBe(2);
    expect(milestoneIndex("EXCEPTION", [])).toBe(0);
  });
});
