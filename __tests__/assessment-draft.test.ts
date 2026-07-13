import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DRAFT_KEY, DRAFT_VERSION, clearDraft, loadDraft, saveDraft } from "@/lib/assessment/draft";
import { INITIAL_FULL_FORM, type FullAssessmentForm } from "@/lib/assessment/types";

/** Minimal in-memory Storage stand-in — vitest runs this suite under the "node" environment, so there is no real window/localStorage. */
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

describe("assessment draft persistence", () => {
  beforeEach(() => {
    (globalThis as unknown as { window: Window }).window = {
      localStorage: createMockStorage(),
    } as unknown as Window;
  });

  afterEach(() => {
    delete (globalThis as { window?: Window }).window;
  });

  it("round-trips a saved draft", () => {
    const form: FullAssessmentForm = { ...INITIAL_FULL_FORM, monthlyGrossIncome: 6500, creditScore: 720 };
    saveDraft(form, 4);

    const loaded = loadDraft();
    expect(loaded).toEqual({ form, index: 4 });
  });

  it("returns null when nothing has been saved", () => {
    expect(loadDraft()).toBeNull();
  });

  it("invalidates a draft saved under a different schema version", () => {
    const staleEnvelope = {
      version: DRAFT_VERSION - 1,
      form: INITIAL_FULL_FORM,
      index: 2,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(staleEnvelope));

    expect(loadDraft()).toBeNull();
  });

  it("clears a saved draft", () => {
    saveDraft(INITIAL_FULL_FORM, 1);
    expect(loadDraft()).not.toBeNull();

    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it("returns null when the stored value is corrupt JSON", () => {
    window.localStorage.setItem(DRAFT_KEY, "{not valid json");
    expect(loadDraft()).toBeNull();
  });

  it("returns null for a well-formed but incomplete envelope", () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: DRAFT_VERSION }));
    expect(loadDraft()).toBeNull();
  });

  it("is SSR-safe: no-ops and returns null when window is undefined", () => {
    delete (globalThis as { window?: Window }).window;

    expect(loadDraft()).toBeNull();
    expect(() => saveDraft(INITIAL_FULL_FORM, 0)).not.toThrow();
    expect(() => clearDraft()).not.toThrow();
  });
});
