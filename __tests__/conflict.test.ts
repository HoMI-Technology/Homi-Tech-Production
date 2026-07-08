import { describe, expect, it } from "vitest";
import { deriveConflictSignals } from "@/lib/conflict/engine";

describe("deriveConflictSignals", () => {
  it("fires nothing when no risk conditions are present", () => {
    const signals = deriveConflictSignals({
      fomoLevel: 1,
      timeHorizonMonths: 12,
      referralSource: "me",
      deadlineOrigin: "mine",
    });
    expect(signals).toEqual([]);
  });

  it("fires HERD_PRESSURE when fomoLevel >= 8", () => {
    const signals = deriveConflictSignals({ fomoLevel: 8, timeHorizonMonths: 12 });
    expect(signals.some((s) => s.code === "HERD_PRESSURE")).toBe(true);
  });

  it("does not fire HERD_PRESSURE below threshold", () => {
    const signals = deriveConflictSignals({ fomoLevel: 7, timeHorizonMonths: 12 });
    expect(signals.some((s) => s.code === "HERD_PRESSURE")).toBe(false);
  });

  it("fires MANUFACTURED_URGENCY when short timeline plus high fomo", () => {
    const signals = deriveConflictSignals({ fomoLevel: 6, timeHorizonMonths: 2 });
    expect(signals.some((s) => s.code === "MANUFACTURED_URGENCY")).toBe(true);
    const signal = signals.find((s) => s.code === "MANUFACTURED_URGENCY");
    expect(signal?.severity).toBe("protect");
  });

  it("does not fire MANUFACTURED_URGENCY when timeline is long", () => {
    const signals = deriveConflictSignals({ fomoLevel: 9, timeHorizonMonths: 6 });
    expect(signals.some((s) => s.code === "MANUFACTURED_URGENCY")).toBe(false);
  });

  it("does not fire MANUFACTURED_URGENCY when fomo is low even with a short timeline", () => {
    const signals = deriveConflictSignals({ fomoLevel: 2, timeHorizonMonths: 1 });
    expect(signals.some((s) => s.code === "MANUFACTURED_URGENCY")).toBe(false);
  });

  it("fires COMMISSION_EXPOSURE for an agent referral", () => {
    const signals = deriveConflictSignals({ fomoLevel: 1, timeHorizonMonths: 12, referralSource: "agent" });
    expect(signals.some((s) => s.code === "COMMISSION_EXPOSURE")).toBe(true);
  });

  it("fires COMMISSION_EXPOSURE for a lender referral", () => {
    const signals = deriveConflictSignals({ fomoLevel: 1, timeHorizonMonths: 12, referralSource: "lender" });
    expect(signals.some((s) => s.code === "COMMISSION_EXPOSURE")).toBe(true);
  });

  it("does not fire COMMISSION_EXPOSURE for self or family referral", () => {
    const signals = deriveConflictSignals({ fomoLevel: 1, timeHorizonMonths: 12, referralSource: "family" });
    expect(signals.some((s) => s.code === "COMMISSION_EXPOSURE")).toBe(false);
  });

  it("fires EXTERNAL_DEADLINE when the deadline origin is external", () => {
    const signals = deriveConflictSignals({ fomoLevel: 1, timeHorizonMonths: 12, deadlineOrigin: "external" });
    expect(signals.some((s) => s.code === "EXTERNAL_DEADLINE")).toBe(true);
    expect(signals.find((s) => s.code === "EXTERNAL_DEADLINE")?.severity).toBe("info");
  });

  it("does not fire EXTERNAL_DEADLINE when there is no real deadline", () => {
    const signals = deriveConflictSignals({ fomoLevel: 1, timeHorizonMonths: 12, deadlineOrigin: "none" });
    expect(signals.some((s) => s.code === "EXTERNAL_DEADLINE")).toBe(false);
  });

  it("can fire multiple signals simultaneously", () => {
    const signals = deriveConflictSignals({
      fomoLevel: 9,
      timeHorizonMonths: 2,
      referralSource: "agent",
      deadlineOrigin: "external",
    });
    expect(signals.map((s) => s.code).sort()).toEqual(
      ["COMMISSION_EXPOSURE", "EXTERNAL_DEADLINE", "HERD_PRESSURE", "MANUFACTURED_URGENCY"].sort(),
    );
  });
});
