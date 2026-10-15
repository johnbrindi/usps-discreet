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

  it("never allows jumping straight to delivered from a pre-delivery state", () => {
    for (const s of ["INFO_RECEIVED", "ACCEPTED", "IN_TRANSIT", "ARRIVED_AT_FACILITY", "EXCEPTION"] as const) {
      expect(canTransition(s, "DELIVERED")).toBe(false);
    }
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
  });

  it("allows no transitions out of delivered", () => {
    for (const s of SHIPMENT_STATUSES) expect(canTransition("DELIVERED", s)).toBe(false);
  });

  it("does not let a shipment move backwards to label created", () => {
    for (const s of SHIPMENT_STATUSES) expect(canTransition(s, "INFO_RECEIVED")).toBe(false);
  });

  it("allows repeated facility scans and exception recovery", () => {
    expect(canTransition("ARRIVED_AT_FACILITY", "ARRIVED_AT_FACILITY")).toBe(true);
    expect(canTransition("EXCEPTION", "OUT_FOR_DELIVERY")).toBe(true);
  });

  it("offers label-created as the first event on a new shipment", () => {
    expect(nextStatusOptions("INFO_RECEIVED", false)).toEqual(["INFO_RECEIVED", "ACCEPTED", "EXCEPTION"]);
    expect(nextStatusOptions("DELIVERED", true)).toEqual([]);
  });

  it("computes milestone progress, including for exceptions", () => {
    expect(milestoneIndex("INFO_RECEIVED")).toBe(0);
    expect(milestoneIndex("ARRIVED_AT_FACILITY")).toBe(1);
    expect(milestoneIndex("DELIVERED")).toBe(3);
    expect(milestoneIndex("EXCEPTION", ["OUT_FOR_DELIVERY", "IN_TRANSIT"])).toBe(2);
    expect(milestoneIndex("EXCEPTION", [])).toBe(0);
  });
});
