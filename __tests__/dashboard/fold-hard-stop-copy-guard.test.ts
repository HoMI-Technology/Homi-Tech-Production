/**
 * Guard: the signed-in fold never tells a user the wrong hard stop.
 *
 * A user stopped by DTI, housing, or credit must never be told that runway is
 * the hold, because the fix for that (#345) lives in three separate copy
 * functions that any conflict resolution can quietly revert. This file exists
 * to make that revert fail loudly instead of silently.
 *
 * Deliberately a NEW file rather than an addition to fold-truth.test.ts:
 * three branches are editing that file on three different bases, and a guard
 * that can be lost in a conflict resolution is not a guard.
 */

import { describe, expect, it } from "vitest";
import {
  FOLD_HARD_STOP_CODES,
  foldHardStopEyebrow,
  foldHardStopOverrideLine,
  foldHomeHoldSentence,
  isFoldHardStopCode,
  resolveFoldHardStopCode,
  type FoldHardStopCode,
} from "@/lib/dashboard/fold-truth";

const RUNWAY: FoldHardStopCode = "RUNWAY_UNDER_1_MONTH";
const NON_RUNWAY = FOLD_HARD_STOP_CODES.filter((c) => c !== RUNWAY);

/** Every line the fold shows a user while a hard stop is active. */
function foldCopyFor(code: FoldHardStopCode): string[] {
  return [
    foldHardStopEyebrow(code),
    foldHomeHoldSentence(code),
    foldHardStopOverrideLine(61, code),
  ];
}

describe("fold hard-stop copy — never names the wrong stop", () => {
  it("covers every stop code the engine can emit", () => {
    // If the engine gains a fifth hard stop, this fails until the fold has
    // copy for it — better than shipping a stop that renders runway wording.
    expect([...FOLD_HARD_STOP_CODES].sort()).toEqual(
      [
        "CREDIT_UNDER_620",
        "DTI_OVER_50",
        "HOUSING_RATIO_OVER_45",
        "RUNWAY_UNDER_1_MONTH",
      ].sort(),
    );
  });

  it.each(NON_RUNWAY)(
    "%s never tells the user runway is the hold",
    (code) => {
      for (const line of foldCopyFor(code)) {
        expect(
          line.toLowerCase(),
          `a ${code} user was shown runway wording: "${line}"`,
        ).not.toContain("runway");
      }
    },
  );

  it.each(NON_RUNWAY)("%s names its own cause on screen", (code) => {
    const noun = {
      DTI_OVER_50: "dti",
      HOUSING_RATIO_OVER_45: "housing",
      CREDIT_UNDER_620: "credit",
    }[code as Exclude<FoldHardStopCode, typeof RUNWAY>];

    const shown = foldCopyFor(code).join(" ").toLowerCase();
    expect(shown, `${code} copy never names ${noun}`).toContain(noun);
  });

  it("car housing stop says payment, not housing or home", () => {
    const shown = [
      foldHardStopEyebrow("HOUSING_RATIO_OVER_45", "car"),
      foldHomeHoldSentence("HOUSING_RATIO_OVER_45", "car"),
      foldHardStopOverrideLine(61, "HOUSING_RATIO_OVER_45", "car"),
    ]
      .join(" ")
      .toLowerCase()
      .replace(/take-home/g, "");
    expect(shown).toContain("payment");
    expect(shown).not.toContain("housing");
    expect(shown).not.toMatch(/\bhome\b/);
  });

  it("gives each stop code distinct copy — no two stops read alike", () => {
    const rendered = FOLD_HARD_STOP_CODES.map((c) => foldCopyFor(c).join("|"));
    expect(new Set(rendered).size).toBe(FOLD_HARD_STOP_CODES.length);
  });

  it("keeps the score in the override line and never zeroes it", () => {
    // Canon: gates override the score; the score itself is still shown.
    for (const code of FOLD_HARD_STOP_CODES) {
      expect(foldHardStopOverrideLine(61, code)).toContain("61");
    }
  });

  it("rejects codes the engine does not emit", () => {
    expect(isFoldHardStopCode("RUNWAY")).toBe(false);
    expect(isFoldHardStopCode("dti_over_50")).toBe(false);
    expect(isFoldHardStopCode(null)).toBe(false);
    expect(isFoldHardStopCode(undefined)).toBe(false);
  });

  /**
   * The fallback is a live product decision, not settled behavior. An absent
   * or unrecognized code currently resolves to runway, so a legacy row without
   * a `code` field would assert runway to a DTI user. `resolveFoldPathPrimary`
   * takes the opposite posture: unknown code means no swap.
   *
   * This test pins today's behavior so the decision cannot change by accident.
   * If the fallback is made neutral, update this test deliberately — that edit
   * is the record of the decision.
   */
  it("documents the unresolved fallback: unknown code resolves to runway", () => {
    expect(resolveFoldHardStopCode(null)).toBe(RUNWAY);
    expect(resolveFoldHardStopCode(undefined)).toBe(RUNWAY);
    expect(resolveFoldHardStopCode("NOT_A_CODE" as FoldHardStopCode)).toBe(
      RUNWAY,
    );
  });
});
