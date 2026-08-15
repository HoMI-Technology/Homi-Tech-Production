import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectAcuteDistress, CRISIS_SUPPORT_MESSAGE } from "@/lib/advisor/crisis";
import {
  PHASE0_BANNED_SURFACE_STRINGS,
  PHASE0_FREEZE_MS,
  PHASE0_PAUSE_COPY,
  buildPhase0AdvisorReply,
  evaluatePhase0,
  ingestPhase0Observation,
  isFrozenForPerson,
  renderPhase0ReturnCopy,
  selectPhase0Resources,
  selectPhase0Surface,
} from "@/lib/advisor/phase0";

/**
 * WAVE2 Packet 1 — Phase 0 Safety Canon.
 *
 * Two-category crisis freezes verdicts for 24h. One signal never freezes.
 * Acute self-harm stays a separate single-signal layer.
 */

const TWO_CATEGORY = {
  texts: ["nothing will ever get better and my life is falling apart"],
};

const ONE_SIGNAL = {
  texts: ["I feel hopeless about this mortgage"],
};

const SAME_CATEGORY_TWO = {
  texts: ["nothing will ever get better. I will lose everything if this closes."],
};

describe("evaluatePhase0 — ≥2 signals from ≥2 categories", () => {
  it("freezes a two-category fixture (language + emotional)", () => {
    const result = evaluatePhase0(TWO_CATEGORY);
    expect(result.frozen).toBe(true);
    expect(result.categories).toEqual(expect.arrayContaining(["language", "emotional"]));
    expect(result.categories).toHaveLength(2);
    expect(result.signalIds.length).toBeGreaterThanOrEqual(2);
  });

  it("does not freeze a single language signal", () => {
    const result = evaluatePhase0(ONE_SIGNAL);
    expect(result.frozen).toBe(false);
    expect(result.signalIds.length).toBeLessThan(2);
  });

  it("does not freeze two language signals in one category", () => {
    const result = evaluatePhase0(SAME_CATEGORY_TWO);
    expect(result.frozen).toBe(false);
    expect(result.categories).toEqual(["language"]);
  });

  it("freezes behavioral + language named signals", () => {
    const result = evaluatePhase0({
      named: [{ id: "rapid_answer_oscillation" }, { id: "catastrophic_framing" }],
    });
    expect(result.frozen).toBe(true);
    expect(result.categories).toEqual(expect.arrayContaining(["behavioral", "language"]));
  });

  it("never treats a lone acute self-harm phrase as a Phase 0 freeze", () => {
    const text = "sometimes I want to kill myself";
    expect(detectAcuteDistress(text)).toBe(true);
    const result = evaluatePhase0({ texts: [text], selfHarm: true });
    expect(result.frozen).toBe(false);
    expect(result.selfHarm).toBe(true);
  });

  it("does not invent Stress Capacity or Fear-to-Desire floors", () => {
    const result = evaluatePhase0({
      texts: ["my stress is a 10 and my fear is a 10"],
    });
    expect(result.frozen).toBe(false);
  });
});

describe("Phase 0 freeze store — 24h per person", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: memoryStorage(),
      sessionStorage: memoryStorage(),
      dispatchEvent: () => true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets the freeze flag for the person who tripped, not a partner", () => {
    const now = Date.now();
    const guest = ingestPhase0Observation({
      personKey: "guest",
      texts: TWO_CATEGORY.texts,
      nowMs: now,
    });
    expect(guest.frozen).toBe(true);
    expect(guest.record?.personKey).toBe("guest");
    expect(isFrozenForPerson("guest", now + 1_000)).toBe(true);
    expect(isFrozenForPerson("user:partner", now + 1_000)).toBe(false);
    expect(selectPhase0Surface("user:partner", true, now + 1_000)).toBe("open");
  });

  it("lifts after 24h with no welcome-back-from-crisis state", () => {
    const now = Date.now();
    ingestPhase0Observation({
      personKey: "user:a",
      texts: TWO_CATEGORY.texts,
      nowMs: now,
    });
    expect(isFrozenForPerson("user:a", now + PHASE0_FREEZE_MS + 1)).toBe(false);
    expect(selectPhase0Surface("user:a", true, now + PHASE0_FREEZE_MS + 1)).toBe("open");
  });

  it("one-signal fixture never writes a freeze record", () => {
    const result = ingestPhase0Observation({
      personKey: "guest",
      texts: ONE_SIGNAL.texts,
    });
    expect(result.frozen).toBe(false);
    expect(result.record).toBeNull();
    expect(isFrozenForPerson("guest")).toBe(false);
  });
});

describe("Phase 0 Brand copy — verbatim, no verdict tokens", () => {
  it("keeps the pause paragraph word-locked", () => {
    expect(PHASE0_PAUSE_COPY).toContain("I want to pause for a moment.");
    expect(PHASE0_PAUSE_COPY).toContain("HōMI isn't here to push you through distress.");
    expect(PHASE0_PAUSE_COPY).not.toMatch(/HōMI says/);
  });

  it("never writes verdict / pathway tokens on freeze surfaces", () => {
    const until = Date.now() + PHASE0_FREEZE_MS;
    const surfaces = [
      PHASE0_PAUSE_COPY,
      renderPhase0ReturnCopy(until),
      buildPhase0AdvisorReply(
        { until, financialStress: true, selfHarm: true },
        "trip",
      ),
      buildPhase0AdvisorReply(
        { until, financialStress: true, selfHarm: true },
        "return",
      ),
    ];
    for (const text of surfaces) {
      for (const banned of PHASE0_BANNED_SURFACE_STRINGS) {
        expect(text).not.toContain(banned);
      }
      expect(text).not.toMatch(/\bALMOST_THERE\b/);
      expect(text).not.toMatch(/\bNOT_YET\b/);
      expect(text.toLowerCase()).not.toContain("pathway");
      expect(text.toLowerCase()).not.toContain("you're not ready");
    }
  });

  it("locks resource slots: SAMHSA always, NFCC only for financial-stress, 988 only for self-harm", () => {
    const base = selectPhase0Resources({ financialStress: false, selfHarm: false });
    expect(base).toHaveLength(1);
    expect(base[0]?.label).toContain("SAMHSA");
    expect(base[0]?.detail).toBe("1-800-662-4357");

    const money = selectPhase0Resources({ financialStress: true, selfHarm: false });
    expect(money.map((r) => r.slot)).toEqual([1, 2]);
    expect(money[1]?.label).toBe("NFCC");
    expect(money.some((r) => r.detail === "988")).toBe(false);

    const crisis = selectPhase0Resources({ financialStress: true, selfHarm: true });
    expect(crisis).toHaveLength(3);
    expect(crisis[0]?.label).toContain("SAMHSA");
    expect(crisis[2]?.detail).toBe("988");
    expect(crisis[0]?.detail).not.toBe("988");
  });
});

describe("acute layer is unchanged", () => {
  it("still fires the word-locked 988 + Crisis Text Line reply copy", () => {
    expect(detectAcuteDistress("I don't want to be here anymore")).toBe(true);
    expect(CRISIS_SUPPORT_MESSAGE).toContain("988");
    expect(CRISIS_SUPPORT_MESSAGE).toContain("741741");
  });
});

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}
