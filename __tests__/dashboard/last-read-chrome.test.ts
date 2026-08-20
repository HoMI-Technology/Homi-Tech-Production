import { describe, expect, it } from "vitest";
import type { VerdictKey } from "@/lib/brand";
import {
  PUBLIC_VERDICT_LABELS,
  closerToLine,
  lastReadAgeFrom,
  lastReadSentence,
  moneyPictureImproved,
  nextPublicVerdict,
  publicVerdictLabel,
} from "@/lib/dashboard/last-read-chrome";

describe("last-read chrome — MEASURE_ACT_W1", () => {
  it("uses Brand verdict words and calendar age", () => {
    const keys: VerdictKey[] = ["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"];
    const labels = keys.map(publicVerdictLabel);
    expect(labels).toEqual(["READY", "ALMOST THERE", "BUILD FIRST", "DO NOT PROCEED"]);
    expect(labels).toEqual([...PUBLIC_VERDICT_LABELS]);
    for (const label of labels) {
      expect(label).not.toBe("NOT_YET");
      expect(label).not.toMatch(/^Not yet$/i);
    }
    expect(lastReadAgeFrom("2026-03-15T12:00:00.000Z")).toBe("from March 15.");
  });

  it("names the next public band in Brand words — never NOT_YET", () => {
    expect(nextPublicVerdict("NOT_YET")).toBe("BUILD_FIRST");
    expect(closerToLine("NOT_YET")).toBe("closer to BUILD FIRST.");
    expect(closerToLine("BUILD_FIRST")).toBe("closer to ALMOST THERE.");
    expect(closerToLine("ALMOST_THERE")).toBe("closer to READY.");
    expect(closerToLine("READY")).toBeNull();
  });

  it("closer-to only when Money moved improving — no new score", () => {
    expect(
      moneyPictureImproved({
        lastDtiRatio: 0.4,
        lastEmergencyFundMonths: 2,
        lastSavingsRateRatio: 0.06,
        currentDtiPercent: 27,
        currentEmergencyFundMonths: 2,
        currentSavingsRatePercent: 6,
      }),
    ).toBe(true);
    expect(
      moneyPictureImproved({
        lastDtiRatio: 0.2,
        lastEmergencyFundMonths: 6,
        lastSavingsRateRatio: 0.22,
        currentDtiPercent: 44,
        currentEmergencyFundMonths: 2,
        currentSavingsRatePercent: 4,
      }),
    ).toBe(false);
    expect(
      moneyPictureImproved({
        lastDtiRatio: 0.3,
        lastEmergencyFundMonths: 4,
        lastSavingsRateRatio: 0.12,
        currentDtiPercent: 32,
        currentEmergencyFundMonths: 4.5,
        currentSavingsRatePercent: 11,
      }),
    ).toBe(false);
  });

  it("one sentence: age + closer-to; READY has no closer-to; hard stop yields progress", () => {
    expect(
      lastReadSentence({
        verdict: "BUILD_FIRST",
        age: "from March 15.",
        improving: true,
        hardStop: false,
      }),
    ).toBe("from March 15. closer to ALMOST THERE.");
    expect(
      lastReadSentence({
        verdict: "READY",
        age: "from March 15.",
        improving: true,
        hardStop: false,
      }),
    ).toBe("from March 15.");
    expect(
      lastReadSentence({
        verdict: "ALMOST_THERE",
        age: "from March 15.",
        improving: true,
        hardStop: true,
      }),
    ).toBe("from March 15.");
    expect(
      lastReadSentence({
        verdict: "ALMOST_THERE",
        age: "from March 15.",
        improving: true,
        hardStop: true,
      }),
    ).not.toMatch(/closer to READY/);
    expect(
      lastReadSentence({
        verdict: "BUILD_FIRST",
        age: "from March 15.",
        improving: false,
        hardStop: false,
      }),
    ).toBe("from March 15.");
    expect(
      lastReadSentence({
        verdict: "NOT_YET",
        age: "from March 15.",
        improving: true,
        hardStop: false,
      }),
    ).toBe("from March 15. closer to BUILD FIRST.");
  });
});
