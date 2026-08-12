import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DRAFT_KEY,
  DRAFT_VERSION,
  clearDraft,
  clampDraftIndex,
  draftLooksStarted,
  loadDraft,
  saveDraft,
  type AssessmentDraft,
} from "@/lib/assessment/draft";

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

const sampleDraft = (): AssessmentDraft => ({
  decisionType: "home_buying",
  responses: { fin_income: 6500 },
  conflict: { referralSource: null, deadlineOrigin: null },
  index: 4,
});

describe("assessment draft persistence (bank flow v2)", () => {
  beforeEach(() => {
    (globalThis as unknown as { window: Window }).window = {
      localStorage: createMockStorage(),
    } as unknown as Window;
  });

  afterEach(() => {
    delete (globalThis as { window?: Window }).window;
  });

  it("round-trips a saved draft", () => {
    saveDraft(sampleDraft());
    const loaded = loadDraft(50);
    expect(loaded?.responses.fin_income).toBe(6500);
    expect(loaded?.index).toBe(4);
    expect(loaded?.updatedAt).toBeTruthy();
  });

  it("returns null when nothing has been saved", () => {
    expect(loadDraft()).toBeNull();
  });

  it("invalidates a draft saved under a different schema version", () => {
    const staleEnvelope = {
      version: DRAFT_VERSION - 1,
      decisionType: "home_buying",
      responses: {},
      conflict: { referralSource: null, deadlineOrigin: null },
      index: 2,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(staleEnvelope));
    expect(loadDraft()).toBeNull();
  });

  it("clears a saved draft", () => {
    saveDraft(sampleDraft());
    expect(loadDraft()).not.toBeNull();
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it("ignores blank drafts that look like a fresh start", () => {
    saveDraft({
      decisionType: "home_buying",
      responses: {},
      conflict: { referralSource: null, deadlineOrigin: null },
      index: 0,
    });
    expect(
      draftLooksStarted({
        responses: {},
        conflict: { referralSource: null, deadlineOrigin: null },
        index: 0,
      }),
    ).toBe(false);
    expect(loadDraft()).toBeNull();
  });

  it("clamps loaded index to max step", () => {
    saveDraft({ ...sampleDraft(), index: 40 });
    const loaded = loadDraft(5);
    expect(loaded?.index).toBe(5);
  });

  it("clamps out-of-range step indexes", () => {
    expect(clampDraftIndex(-3, 10)).toBe(0);
    expect(clampDraftIndex(99, 5)).toBe(5);
  });

  it("invalidates a draft whose decisionType is canon but not active", () => {
    // A resumed inactive vertical builds a zero-question flow and the server
    // rejects its submit — the draft must be treated as unresumable instead.
    const envelope = {
      version: DRAFT_VERSION,
      // "education" is canon-but-inactive; "car" went active at 5.9 phase 2.
      decisionType: "education",
      responses: { fin_income: 6500 },
      conflict: { referralSource: null, deadlineOrigin: null },
      index: 4,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(envelope));
    expect(loadDraft()).toBeNull();
  });

  it("invalidates a draft with a foreign decisionType slug", () => {
    const envelope = {
      version: DRAFT_VERSION,
      decisionType: "banana",
      responses: { fin_income: 6500 },
      conflict: { referralSource: null, deadlineOrigin: null },
      index: 4,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(envelope));
    expect(loadDraft()).toBeNull();
  });
});
