import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SHADOW_DRAFT_KEY,
  SHADOW_DRAFT_VERSION,
  clearShadowDraft,
  loadShadowDraft,
  saveShadowDraft,
  INITIAL_SHADOW_FORM,
} from "@/lib/assessment/shadow-draft";

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

describe("shadow score draft persistence", () => {
  beforeEach(() => {
    (globalThis as unknown as { window: Window }).window = {
      localStorage: createMockStorage(),
      sessionStorage: createMockStorage(),
    } as unknown as Window;
  });

  afterEach(() => {
    delete (globalThis as { window?: Window }).window;
  });

  it("round-trips a shadow draft", () => {
    const form = {
      ...INITIAL_SHADOW_FORM,
      monthlyGrossIncome: 7200,
      emergencyFundChoice: "3to6" as const,
    };
    saveShadowDraft(form, 2);
    const loaded = loadShadowDraft(5);
    expect(loaded?.form.monthlyGrossIncome).toBe(7200);
    expect(loaded?.form.emergencyFundChoice).toBe("3to6");
    expect(loaded?.index).toBe(2);
  });

  it("returns null for blank drafts", () => {
    saveShadowDraft(INITIAL_SHADOW_FORM, 0);
    expect(loadShadowDraft()).toBeNull();
  });

  it("invalidates version mismatches", () => {
    window.sessionStorage.setItem(
      SHADOW_DRAFT_KEY,
      JSON.stringify({
        version: SHADOW_DRAFT_VERSION - 1,
        form: { ...INITIAL_SHADOW_FORM, monthlyGrossIncome: 1 },
        index: 1,
        updatedAt: new Date().toISOString(),
      }),
    );
    expect(loadShadowDraft()).toBeNull();
  });

  it("clears on clearShadowDraft", () => {
    saveShadowDraft({ ...INITIAL_SHADOW_FORM, creditBand: "good" }, 1);
    expect(loadShadowDraft()).not.toBeNull();
    clearShadowDraft();
    expect(loadShadowDraft()).toBeNull();
  });

  it("discards leftover localStorage drafts from the old score flow", () => {
    window.localStorage.setItem(
      SHADOW_DRAFT_KEY,
      JSON.stringify({
        version: SHADOW_DRAFT_VERSION,
        form: { ...INITIAL_SHADOW_FORM, monthlyGrossIncome: 9000 },
        index: 4,
        updatedAt: new Date().toISOString(),
      }),
    );
    expect(loadShadowDraft()).toBeNull();
    expect(window.localStorage.getItem(SHADOW_DRAFT_KEY)).toBeNull();
  });
});
