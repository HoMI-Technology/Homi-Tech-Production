// @vitest-environment jsdom
/**
 * "Your HōMI" identity + freshness contracts. What matters:
 * - the identity survives storage round-trips and never stores junk names
 * - freshness (ageDays) rides along with context so the Companion can be
 *   honest about stale data — and is null rather than wrong when unknown.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_IDENTITY_NAME,
  IDENTITY_NAME_MAX,
  HOMI_PRESETS,
  getPreset,
  hasChosenIdentity,
  loadIdentity,
  saveIdentity,
  sanitizeIdentityName,
} from "@/lib/advisor/identity";
import { PERSONAS } from "@/lib/advisor/personas";
import { buildFinanceContext } from "@/lib/advisor/context";
import { DEFAULT_FINANCE_STATE, saveFinanceState, financeSavedAt } from "@/lib/finance/store";

beforeEach(() => {
  window.localStorage.clear();
});

describe("identity store", () => {
  it("defaults to HōMI when nothing is saved", () => {
    expect(loadIdentity().name).toBe(DEFAULT_IDENTITY_NAME);
  });

  it("round-trips a user-chosen name and preset", () => {
    saveIdentity({ name: "Moose", preset: "steady" });
    const loaded = loadIdentity();
    expect(loaded.name).toBe("Moose");
    expect(loaded.preset).toBe("steady");
  });

  it("sanitizes whitespace, line breaks, and length", () => {
    expect(sanitizeIdentityName("  Big\nHomie  ")).toBe("Big Homie");
    expect(sanitizeIdentityName("   ")).toBeNull();
    expect(sanitizeIdentityName("x".repeat(60))).toHaveLength(IDENTITY_NAME_MAX);
  });

  it("falls back to the default rather than storing an empty name", () => {
    const saved = saveIdentity({ name: "   ", preset: "homi" });
    expect(saved.name).toBe(DEFAULT_IDENTITY_NAME);
    expect(loadIdentity().name).toBe(DEFAULT_IDENTITY_NAME);
  });

  it("ignores corrupted storage and unknown presets", () => {
    window.localStorage.setItem("homi:companion-identity", "{not json");
    expect(loadIdentity().name).toBe(DEFAULT_IDENTITY_NAME);
    window.localStorage.setItem(
      "homi:companion-identity",
      JSON.stringify({ name: "Moose", preset: "dragon" }),
    );
    expect(loadIdentity().preset).toBe("homi");
  });

  it("tracks whether an identity was ever chosen (gates the first-open picker)", () => {
    expect(hasChosenIdentity()).toBe(false);
    saveIdentity({ name: "Clarity", preset: "clarity" });
    expect(hasChosenIdentity()).toBe(true);
  });
});

describe("starter presets", () => {
  it("offers a small curated set — a few, not fifty", () => {
    expect(HOMI_PRESETS.length).toBeGreaterThanOrEqual(3);
    expect(HOMI_PRESETS.length).toBeLessThanOrEqual(6);
  });

  it("every preset maps to a real persona", () => {
    for (const p of HOMI_PRESETS) {
      expect(PERSONAS.some((persona) => persona.key === p.persona)).toBe(true);
    }
  });

  it("resolves unknown preset keys to the classic", () => {
    expect(getPreset("nonsense").key).toBe("homi");
    expect(getPreset(undefined).key).toBe("homi");
  });
});

describe("freshness signals", () => {
  it("stamps savedAt when finance state is saved", () => {
    expect(financeSavedAt()).toBeNull();
    saveFinanceState(DEFAULT_FINANCE_STATE);
    const at = financeSavedAt();
    expect(at).toBeTruthy();
    expect(Number.isNaN(Date.parse(at as string))).toBe(false);
  });

  it("reports ageDays 0 for freshly saved finance data", () => {
    saveFinanceState(DEFAULT_FINANCE_STATE);
    expect(buildFinanceContext()?.ageDays).toBe(0);
  });

  it("reports ageDays null when the timestamp predates the feature", () => {
    // Simulate a user who saved finance data before savedAt existed.
    window.localStorage.setItem("homi:finance", JSON.stringify(DEFAULT_FINANCE_STATE));
    expect(buildFinanceContext()?.ageDays).toBeNull();
  });

  it("computes whole days for older saves", () => {
    saveFinanceState(DEFAULT_FINANCE_STATE);
    const fortyDaysAgo = new Date(Date.now() - 40 * 86_400_000).toISOString();
    window.localStorage.setItem("homi:finance:saved-at", fortyDaysAgo);
    expect(buildFinanceContext()?.ageDays).toBe(40);
  });
});
