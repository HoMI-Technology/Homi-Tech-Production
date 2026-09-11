/**
 * Money v4 — live `/money` in Shell v4.
 * Empty or live SSOT. No surplus hero, no second score.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const workspace = read("lib/v4/money-workspace.ts");
const page = read("app/(product)/money/page.tsx");
const ui = read("components/v4/money/MoneyWorkspaceV4.tsx");

describe("Money picture — quiet v4 workspace", () => {
  it("page mounts MoneyWorkspaceV4 without a second score write", () => {
    expect(page).toContain("MoneyWorkspaceV4");
    expect(page).toContain("assertAssessmentResultOnly");
    expect(page).not.toContain("ScoreRail");
    expect(page).not.toContain("MoneyStand");
    expect(page).not.toMatch(/\.insert\(|\.upsert\(|\.update\(/);
    expect(page).not.toContain("lib/scoring");
  });

  it("empty honesty and live facts stay on the live /money route", () => {
    expect(workspace).toContain("MONEY_WAIT_LINE");
    expect(workspace).toContain("never invent balances");
    expect(ui).toContain("data-money-v4-connect");
    expect(workspace).toContain("Liquid cash");
  });

  it("does not mount compass, Fraunces, or a score numeral class on live $", () => {
    expect(ui).not.toContain("ThresholdCompass");
    expect(ui).not.toContain("font-display");
    expect(ui).not.toContain("score-numeral");
    expect(ui).not.toContain("text-6xl");
    expect(ui).toContain("v4-money-hero-amount");
  });
});

describe("Money picture — honesty contract", () => {
  it("unmounted MoneyStand satellite is gone — live /money is MoneyWorkspaceV4", () => {
    expect(existsSync(resolve(process.cwd(), "components/money/MoneyStand.tsx"))).toBe(false);
    expect(page).not.toContain("MoneyStand");
    expect(ui).not.toContain("MoneyStand");
  });

  it("educational posture stays on the money surface", () => {
    expect(page).toMatch(/Educational/);
    expect(workspace).toContain("never invent balances");
  });
});
