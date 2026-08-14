import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TIME_HORIZON_LABELS } from "@/lib/assessment/types";
import {
  SHADOW_READ_CONFIDENCE_HIGH,
  SHADOW_READ_CONFIDENCE_LOW,
  SHADOW_READ_DISCLAIMER,
  SHADOW_READ_DONE_KEY,
  SHADOW_READ_HELPER,
  SHADOW_READ_KICKER,
  SHADOW_READ_PRIMARY_CTA,
  SHADOW_READ_PRIMARY_HREF,
  SHADOW_READ_SECONDARY_CTA,
  SHADOW_READ_SEE_BUTTON,
  SHADOW_READ_STEMS,
  SHADOW_READ_SUBMITTING,
  SHADOW_READ_TITLE,
  SHADOW_READ_UNUSED_STEMS,
  buildShadowReadLines,
  clearShadowReadDone,
  formatShadowConfidenceRead,
  formatShadowHorizonRead,
  formatShadowMoney,
  loadShadowReadDone,
  restatedConfidence,
  restatedHorizon,
  restatedIncomeDebt,
  saveShadowReadDone,
} from "@/lib/assessment/shadow-read";

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("Packet B — word-locked 90-second read copy", () => {
  it("locks title, kicker, buttons, disclaimer, helper, and CTA", () => {
    expect(SHADOW_READ_TITLE).toBe("90-second read");
    expect(SHADOW_READ_KICKER).toBe("Educational. Not a verdict.");
    expect(SHADOW_READ_SEE_BUTTON).toBe("See the read");
    expect(SHADOW_READ_SUBMITTING).toBe("One moment");
    expect(SHADOW_READ_DISCLAIMER).toBe(
      "This is a read of what you just said. Educational only. Not a HōMI verdict.",
    );
    expect(SHADOW_READ_PRIMARY_CTA).toBe("Create an account, then Assess");
    expect(SHADOW_READ_PRIMARY_HREF).toBe("/auth/sign-up?next=/assessment");
    expect(SHADOW_READ_PRIMARY_HREF).not.toContain("/results");
    expect(SHADOW_READ_SECONDARY_CTA).toBe("Not now");
    expect(SHADOW_READ_HELPER).toBe("The full assessment is the verdict. This was only the read.");
  });

  it("asks only the three existing stems", () => {
    expect(SHADOW_READ_STEMS).toEqual(["income-debt", "confidence", "time-horizon"]);
    expect(SHADOW_READ_UNUSED_STEMS).toEqual(["emergency-fund", "credit-band", "fomo"]);
  });

  it("uses live time-horizon labels", () => {
    expect(formatShadowHorizonRead("lt3")).toBe("Less than 3 months");
    expect(formatShadowHorizonRead("3to6")).toBe("3–6 months");
    expect(formatShadowHorizonRead("6to12")).toBe("6–12 months");
    expect(formatShadowHorizonRead("12plus")).toBe("12+ months");
    expect(TIME_HORIZON_LABELS.lt3).toBe("Less than 3 months");
    expect(TIME_HORIZON_LABELS["3to6"]).toBe("3–6 months");
    expect(TIME_HORIZON_LABELS["6to12"]).toBe("6–12 months");
    expect(TIME_HORIZON_LABELS["12plus"]).toBe("12+ months");
  });

  it("restates answers in the locked sentences — no composite", () => {
    expect(restatedIncomeDebt(6500, 800)).toBe(
      "You put monthly income at $6,500 and monthly debt payments at $800.",
    );
    expect(restatedConfidence(SHADOW_READ_CONFIDENCE_LOW)).toBe(
      "On whether buying is the right move, you marked Not confident.",
    );
    expect(restatedHorizon("6–12 months")).toBe("You’re planning to buy in 6–12 months.");
    const lines = buildShadowReadLines({
      monthlyGrossIncome: 6500,
      monthlyDebtPayments: 800,
      confidenceLevel: 1,
      timeHorizonChoice: "6to12",
    });
    expect(lines.incomeDebt).toContain("$6,500");
    expect(lines.confidence).toContain(SHADOW_READ_CONFIDENCE_LOW);
    expect(lines.horizon).toBe("You’re planning to buy in 6–12 months.");
  });

  it("speaks confidence in the slider’s own language — not a band, not out of 10", () => {
    expect(formatShadowConfidenceRead(1)).toBe(SHADOW_READ_CONFIDENCE_LOW);
    expect(formatShadowConfidenceRead(10)).toBe(SHADOW_READ_CONFIDENCE_HIGH);
    expect(formatShadowConfidenceRead(7)).toBe(
      `${SHADOW_READ_CONFIDENCE_LOW} → ${SHADOW_READ_CONFIDENCE_HIGH}`,
    );
    expect(formatShadowMoney(6500)).toBe("$6,500");
    for (const mark of [1, 5, 7, 10]) {
      const spoken = formatShadowConfidenceRead(mark);
      expect(spoken).not.toMatch(/out of 10/i);
      expect(spoken).not.toMatch(/\b(low|medium|high|band)\b/i);
      expect(spoken).not.toMatch(/\d/);
    }
  });
});

describe("Packet B — session answers only", () => {
  beforeEach(() => {
    (globalThis as unknown as { window: Window }).window = {
      sessionStorage: createMockStorage(),
    } as unknown as Window;
  });

  afterEach(() => {
    delete (globalThis as { window?: Window }).window;
  });

  it("round-trips done answers in sessionStorage and never writes a score", () => {
    saveShadowReadDone({
      monthlyGrossIncome: 7200,
      monthlyDebtPayments: 400,
      confidenceLevel: 8,
      timeHorizonChoice: "12plus",
    });
    const loaded = loadShadowReadDone();
    expect(loaded?.monthlyGrossIncome).toBe(7200);
    expect(loaded?.timeHorizonChoice).toBe("12plus");
    const raw = window.sessionStorage.getItem(SHADOW_READ_DONE_KEY);
    expect(raw).toBeTruthy();
    expect(raw).not.toMatch(/verdict/i);
    expect(raw).not.toMatch(/HōMI-Score/);
    expect(raw).not.toMatch(/"score"/);
    clearShadowReadDone();
    expect(loadShadowReadDone()).toBeNull();
  });
});

describe("Packet B — /shadow-score surface guards", () => {
  it("keeps the public path and locked brand lines on the page + flow", () => {
    const page = src("app/(product)/shadow-score/page.tsx");
    expect(page).toContain('canonical: "/shadow-score"');
    expect(page).toContain("SHADOW_READ_TITLE");
    expect(page).toContain("ShadowScoreFlow");

    const flow = src("components/assessment/ShadowScoreFlow.tsx");
    expect(flow).toContain("SHADOW_READ_TITLE");
    expect(flow).toContain("SHADOW_READ_KICKER");
    expect(flow).toContain("SHADOW_READ_SEE_BUTTON");
    expect(flow).toContain("SHADOW_READ_SUBMITTING");
    expect(flow).toContain("SHADOW_READ_DISCLAIMER");
    expect(flow).toContain("SHADOW_READ_PRIMARY_CTA");
    expect(flow).toContain("SHADOW_READ_PRIMARY_HREF");
    expect(flow).toContain("SHADOW_READ_SECONDARY_CTA");
    expect(flow).toContain("SHADOW_READ_HELPER");
    expect(flow).toContain("income-debt");
    expect(flow).toContain("confidence");
    expect(flow).toContain("time-horizon");
    expect(flow).not.toMatch(/router\.push/);
    expect(flow).not.toMatch(/useRouter/);
    expect(flow).not.toMatch(/CountUpScore/);
    expect(flow).not.toMatch(/VerdictBadge/);
    expect(flow).not.toMatch(/READY/);
    expect(flow).not.toMatch(/ALMOST_THERE/);
    expect(flow).not.toMatch(/BUILD_FIRST/);
    expect(flow).not.toMatch(/NOT_YET/);
    expect(flow).not.toMatch(/DO NOT PROCEED/);
    expect(flow).not.toMatch(/HōMI-Score/);
    expect(flow).not.toMatch(/out of 100/);
    expect(flow).not.toMatch(/See my Shadow Score/);
    expect(flow).not.toMatch(/Check My Readiness/);
    expect(flow).not.toMatch(/get a score in 3 questions/i);
    expect(flow).not.toMatch(/get your score/i);
  });
});
