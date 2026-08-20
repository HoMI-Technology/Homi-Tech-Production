import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const WAVE1_UI = [
  "components/dashboard/LastReadChrome.tsx",
  "components/dashboard/MoneyPictureDirection.tsx",
  "components/money/MoneyRecheckPrompt.tsx",
  "components/tools/DebtPayoffScorePreview.tsx",
  "components/finance/ObservedPrefillCard.tsx",
  "lib/dashboard/last-read-chrome.ts",
  "lib/finance/debt-payoff-preview.ts",
  "lib/finance/recheck-prompt.ts",
] as const;

describe("Measure-Act Wave 1 locks", () => {
  it("does not create or rewrite SKU_MATRIX.md", () => {
    expect(existsSync(resolve(process.cwd(), "SKU_MATRIX.md"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "docs/SKU_MATRIX.md"))).toBe(false);
  });

  it("keeps the locked Money prompt and kills the dead moved line", () => {
    const prompt = read("lib/finance/recheck-prompt.ts");
    const ui = read("components/money/MoneyRecheckPrompt.tsx");
    expect(prompt).toContain("Your money picture changed. Re-check readiness?");
    expect(ui).toContain("MONEY_RECHECK_PROMPT");
    expect(ui).toContain("MONEY_RECHECK_RETAKE_HREF");
    expect(ui).toContain("/assessment");
    for (const rel of WAVE1_UI) {
      const src = read(rel);
      expect(src, rel).not.toContain("Your money picture moved. Retake when you want a new verdict.");
      expect(src, rel).not.toMatch(/closer to (ALMOST THERE|READY|BUILD FIRST)/i);
    }
  });

  it("keeps preview shapes empty of points, 0–100, and cutoff numerals", () => {
    const preview = read("lib/finance/debt-payoff-preview.ts");
    const ui = read("components/tools/DebtPayoffScorePreview.tsx");
    expect(preview).toContain("This is not your HōMI Score.");
    expect(preview).toContain("DTI may move into a better band.");
    expect(preview).toContain("DTI may move into a worse band.");
    expect(preview).toContain("Still above the line we treat as a hard stop.");
    expect(preview).toContain("Runway may move into a better band.");
    expect(preview).toContain("Runway may move into a worse band.");
    expect(ui).not.toMatch(/\+7/);
    expect(ui).not.toMatch(/0–100|0-100/);
    expect(ui).not.toMatch(/\b28\b|\b36\b|\b43\b/);
  });

  it("never prefills credit, ET, PT, or fin_dti_ratio when income+debt exist", () => {
    const map = read("lib/finance/observed-prefill.ts");
    const confirm = read("lib/finance/prefill-confirm.ts");
    expect(map).toContain('"fin_income"');
    expect(map).toContain('"fin_debt_payments"');
    expect(map).toContain('"fin_savings_total"');
    expect(map).toContain('"fin_down_payment"');
    expect(map).toContain('"fin_emergency_fund"');
    expect(map).toContain('"fin_dti_ratio"');
    expect(map).toContain('"fin_credit_score"');
    expect(confirm).toContain("delete next.fin_dti_ratio");
    expect(confirm).not.toMatch(/fin_expenses/);
  });

  it("UI verdict labels stay Brand public names — never NOT_YET / Not yet", () => {
    const chrome = read("components/dashboard/LastReadChrome.tsx");
    expect(chrome).toContain("publicVerdictLabel");
    for (const rel of [
      "components/dashboard/LastReadChrome.tsx",
      "components/dashboard/MoneyPictureDirection.tsx",
      "components/money/MoneyRecheckPrompt.tsx",
      "components/tools/DebtPayoffScorePreview.tsx",
    ] as const) {
      const src = read(rel);
      expect(src, rel).not.toContain("NOT_YET");
      expect(src, rel).not.toMatch(/Not yet/);
    }
    const prompt = read("lib/finance/recheck-prompt.ts");
    expect(prompt).toContain("Your money picture changed. Re-check readiness?");
  });

  it("Home chrome lives on the existing scored fold — no closer-to band", () => {
    const fold = read("components/dashboard/HomeFold.tsx");
    const chrome = read("components/dashboard/LastReadChrome.tsx");
    expect(fold).toContain("LastReadChrome");
    expect(fold).toContain("data-home-score-rail");
    expect(chrome).toContain("Last read:");
    expect(chrome).not.toMatch(/closer to/i);
    expect(read("lib/dashboard/last-read-chrome.ts")).not.toMatch(/closer to (ALMOST THERE|READY|BUILD FIRST)/i);
  });
});
