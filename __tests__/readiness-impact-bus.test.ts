// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PathStep, ReadinessPath } from "@/lib/readiness/path";
import type {
  PathResolutionSummary,
  PathStatusCounts,
} from "@/lib/readiness/progress";

/**
 * Impact Bus domain + transport contract (PR #127).
 *
 * Invariants under test:
 * - the only wrapped transition is pending → done; every other call no-ops
 *   with zero store writes, zero events, zero second completedAt stamps;
 * - reassessment completions are real transitions but never publish;
 * - no score is read or serialized anywhere;
 * - sessionStorage / event payloads are untrusted and fail closed;
 * - stored impacts are consume-once (removed before they are returned).
 */

vi.mock("@/lib/readiness/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/readiness/store")>();
  return { ...actual, completePathStep: vi.fn(actual.completePathStep) };
});

type BusModule = typeof import("@/lib/readiness/impact-bus");
type StoreModule = typeof import("@/lib/readiness/store");

let bus: BusModule;
let store: StoreModule;

const PATH_KEY = "homi:readiness-path";
const STAMP_KEY = "homi:readiness-path:updated-at";

function makeStep(over: Partial<PathStep> & { id: string }): PathStep {
  return {
    title: `Step ${over.id}`,
    kind: "milestone",
    daysFromNow: 3,
    reasonCode: "RUNWAY_UNDER_1_MONTH",
    href: "/tools/runway",
    notes: "Protective gate — educational only.",
    fundingTarget: null,
    fundingLabel: null,
    status: "pending",
    completedAt: null,
    ...over,
  };
}

function makePath(steps: PathStep[], over?: Partial<ReadinessPath>): ReadinessPath {
  return {
    id: "path-1",
    version: 1,
    createdAt: new Date().toISOString(),
    assessmentCompletedAt: new Date().toISOString(),
    verdict: "NOT_YET",
    score: 42,
    bindingConstraint: "RUNWAY_UNDER_1_MONTH",
    confidence: "assessment_only",
    disclaimer: "Educational readiness only.",
    steps,
    mode: "build",
    calendarCommittedAt: null,
    ...over,
  };
}

function seedPath(path: ReadinessPath): void {
  window.localStorage.setItem(PATH_KEY, JSON.stringify(path));
  window.localStorage.setItem(STAMP_KEY, String(Date.now()));
}

function storedPath(): ReadinessPath {
  return JSON.parse(window.localStorage.getItem(PATH_KEY) ?? "null") as ReadinessPath;
}

function counts(
  done: number,
  skipped: number,
  pending: number,
): PathStatusCounts {
  return { total: done + skipped + pending, done, skipped, pending };
}

function summary(
  actionable: PathStatusCounts,
  reassessment: PathStatusCounts,
): PathResolutionSummary {
  return {
    actionable,
    reassessment,
    completedRatio: actionable.total > 0 ? actionable.done / actionable.total : 0,
    resolvedRatio:
      actionable.total > 0
        ? (actionable.done + actionable.skipped) / actionable.total
        : 0,
  };
}

function validImpact(over?: Partial<ReturnType<BusModule["parsePathStepImpact"]>> & object) {
  return {
    v: 1,
    actionKind: "path_step_done",
    impactId: "path_step:path-1:s1:2026-08-03T12:00:00.000Z",
    at: new Date().toISOString(),
    pathId: "path-1",
    pathMode: "build",
    stepId: "s1",
    reasonCode: "RUNWAY_UNDER_1_MONTH",
    stepTitle: "Step s1",
    before: summary(counts(0, 0, 2), counts(0, 0, 1)),
    after: summary(counts(1, 0, 1), counts(0, 0, 1)),
    ...over,
  };
}

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_FF_IMPACT_BUS", "true");
  vi.resetModules();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 401 })),
  );
  bus = await import("@/lib/readiness/impact-bus");
  store = await import("@/lib/readiness/store");
  vi.mocked(store.completePathStep).mockClear();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Transition results
// ---------------------------------------------------------------------------

describe("completePathStepWithImpact — transitions", () => {
  it("no path → noop:no_path, zero mutations, zero transport", () => {
    const result = bus.completePathStepWithImpact("s1");
    expect(result).toEqual({ kind: "noop", path: null, reason: "no_path" });
    expect(store.completePathStep).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(bus.LAST_IMPACT_KEY)).toBeNull();
  });

  it("missing step → noop:step_not_found with the loaded path", () => {
    seedPath(makePath([makeStep({ id: "s1" })]));
    const result = bus.completePathStepWithImpact("nope");
    expect(result.kind).toBe("noop");
    if (result.kind === "noop") {
      expect(result.reason).toBe("step_not_found");
      expect(result.path?.id).toBe("path-1");
    }
    expect(store.completePathStep).not.toHaveBeenCalled();
  });

  it("already done → noop:already_done, no second completedAt, no transport", () => {
    const doneAt = "2026-08-01T10:00:00.000Z";
    seedPath(
      makePath([makeStep({ id: "s1", status: "done", completedAt: doneAt })]),
    );
    const listener = vi.fn();
    window.addEventListener(bus.IMPACT_EVENT_NAME, listener);
    const result = bus.completePathStepWithImpact("s1");
    window.removeEventListener(bus.IMPACT_EVENT_NAME, listener);

    expect(result.kind).toBe("noop");
    if (result.kind === "noop") expect(result.reason).toBe("already_done");
    expect(store.completePathStep).not.toHaveBeenCalled();
    expect(storedPath().steps[0].completedAt).toBe(doneAt);
    expect(listener).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(bus.LAST_IMPACT_KEY)).toBeNull();
  });

  it("already skipped → noop:already_skipped, zero mutations", () => {
    seedPath(makePath([makeStep({ id: "s1", status: "skipped" })]));
    const result = bus.completePathStepWithImpact("s1");
    expect(result.kind).toBe("noop");
    if (result.kind === "noop") expect(result.reason).toBe("already_skipped");
    expect(store.completePathStep).not.toHaveBeenCalled();
  });

  it("pending actionable → completed_notified: one mutation, publication, honest summaries", () => {
    vi.setSystemTime(new Date("2026-08-03T12:00:00.000Z"));
    seedPath(
      makePath([
        makeStep({ id: "s1" }),
        makeStep({ id: "s2", title: "Second step" }),
        makeStep({ id: "r1", reasonCode: "REASSESS", href: "/assessment" }),
      ]),
    );
    const listener = vi.fn();
    window.addEventListener(bus.IMPACT_EVENT_NAME, listener);
    const result = bus.completePathStepWithImpact("s1");
    window.removeEventListener(bus.IMPACT_EVENT_NAME, listener);

    expect(result.kind).toBe("completed_notified");
    if (result.kind !== "completed_notified") return;
    expect(store.completePathStep).toHaveBeenCalledTimes(1);
    expect(result.path.steps[0].status).toBe("done");
    expect(result.path.steps[0].completedAt).toBe("2026-08-03T12:00:00.000Z");
    expect(result.transition).toEqual({
      stepId: "s1",
      reasonCode: "RUNWAY_UNDER_1_MONTH",
      wasFirstResolution: true,
    });

    // Impact honesty
    const impact = result.impact;
    expect(bus.parsePathStepImpact(impact)).not.toBeNull();
    expect(impact.before.actionable).toEqual(counts(0, 0, 2));
    expect(impact.after.actionable).toEqual(counts(1, 0, 1));
    expect(impact.after.reassessment).toEqual(counts(0, 0, 1));
    expect(impact.nextActionableTitle).toBe("Second step");
    expect(JSON.stringify(impact)).not.toMatch(/"score"|"delta"|"verdict"/);

    // Transport: stored + dispatched
    expect(listener).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(
      window.sessionStorage.getItem(bus.LAST_IMPACT_KEY) ?? "null",
    );
    expect(stored?.impactId).toBe(impact.impactId);
  });

  it("pending reassessment → completed_silent: real transition, zero publication", () => {
    seedPath(
      makePath([
        makeStep({ id: "s1", status: "done", completedAt: "2026-08-01T00:00:00.000Z" }),
        makeStep({ id: "r1", reasonCode: "REASSESS" }),
      ]),
    );
    const listener = vi.fn();
    window.addEventListener(bus.IMPACT_EVENT_NAME, listener);
    const result = bus.completePathStepWithImpact("r1");
    window.removeEventListener(bus.IMPACT_EVENT_NAME, listener);

    expect(result.kind).toBe("completed_silent");
    if (result.kind !== "completed_silent") return;
    expect(result.reason).toBe("reassessment");
    expect(result.transition.wasFirstResolution).toBe(false);
    expect(storedPath().steps[1].status).toBe("done");
    expect(listener).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(bus.LAST_IMPACT_KEY)).toBeNull();
  });

  it("mutation unexpectedly returning null → safe noop, no publication", () => {
    seedPath(makePath([makeStep({ id: "s1" })]));
    vi.mocked(store.completePathStep).mockReturnValueOnce(null);
    const result = bus.completePathStepWithImpact("s1");
    expect(result.kind).toBe("noop");
    expect(window.sessionStorage.getItem(bus.LAST_IMPACT_KEY)).toBeNull();
  });

  it("public API takes only a stepId — no status parameter", () => {
    expect(bus.completePathStepWithImpact.length).toBe(1);
    expect(bus.completePathStepGuarded.length).toBe(1);
  });

  it("first-resolution is true exactly once per Path", () => {
    seedPath(makePath([makeStep({ id: "s1" }), makeStep({ id: "s2" })]));
    const first = bus.completePathStepWithImpact("s1");
    const second = bus.completePathStepWithImpact("s2");
    expect(first.kind).toBe("completed_notified");
    expect(second.kind).toBe("completed_notified");
    if (first.kind === "noop" || second.kind === "noop") return;
    expect(first.transition.wasFirstResolution).toBe(true);
    expect(second.transition.wasFirstResolution).toBe(false);
  });

  it("a prior skip (any category) means later completions are not first resolutions", () => {
    seedPath(
      makePath([makeStep({ id: "s1", status: "skipped" }), makeStep({ id: "s2" })]),
    );
    const result = bus.completePathStepWithImpact("s2");
    expect(result.kind).toBe("completed_notified");
    if (result.kind === "noop") return;
    expect(result.transition.wasFirstResolution).toBe(false);
  });

  it("impactId embeds path id, step id, and the persisted completion timestamp", () => {
    vi.setSystemTime(new Date("2026-08-03T12:00:00.000Z"));
    seedPath(makePath([makeStep({ id: "s1" })], { id: "path-A" }));
    const result = bus.completePathStepWithImpact("s1");
    if (result.kind !== "completed_notified") throw new Error("expected impact");
    expect(result.impact.impactId).toBe(
      "path_step:path-A:s1:2026-08-03T12:00:00.000Z",
    );
  });

  it("separate Paths with the same step id produce different impact ids", () => {
    vi.setSystemTime(new Date("2026-08-03T12:00:00.000Z"));
    seedPath(makePath([makeStep({ id: "shared" })], { id: "path-A" }));
    const a = bus.completePathStepWithImpact("shared");
    vi.setSystemTime(new Date("2026-08-03T12:00:01.000Z"));
    seedPath(makePath([makeStep({ id: "shared" })], { id: "path-B" }));
    const b = bus.completePathStepWithImpact("shared");
    if (a.kind !== "completed_notified" || b.kind !== "completed_notified") {
      throw new Error("expected impacts");
    }
    expect(a.impact.impactId).not.toBe(b.impact.impactId);
  });

  it("completePathStepGuarded runs the identical transition with zero transport", () => {
    const listener = vi.fn();
    window.addEventListener(bus.IMPACT_EVENT_NAME, listener);
    seedPath(makePath([makeStep({ id: "s1" })]));
    const result = bus.completePathStepGuarded("s1");
    window.removeEventListener(bus.IMPACT_EVENT_NAME, listener);

    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    expect(result.transition.wasFirstResolution).toBe(true);
    expect(storedPath().steps[0].status).toBe("done");
    expect(listener).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(bus.LAST_IMPACT_KEY)).toBeNull();

    // And the duplicate is a no-op
    const dupe = bus.completePathStepGuarded("s1");
    expect(dupe.kind).toBe("noop");
    expect(store.completePathStep).toHaveBeenCalledTimes(1);
  });

  it("flag off → transition still completes but nothing is published", async () => {
    vi.stubEnv("NEXT_PUBLIC_FF_IMPACT_BUS", "false");
    vi.resetModules();
    const offBus: BusModule = await import("@/lib/readiness/impact-bus");
    seedPath(makePath([makeStep({ id: "s1" })]));
    const listener = vi.fn();
    window.addEventListener(offBus.IMPACT_EVENT_NAME, listener);
    const result = offBus.completePathStepWithImpact("s1");
    window.removeEventListener(offBus.IMPACT_EVENT_NAME, listener);

    expect(result.kind).toBe("completed_notified");
    expect(storedPath().steps[0].status).toBe("done");
    expect(listener).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(offBus.LAST_IMPACT_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Payload validation — untrusted input fails closed
// ---------------------------------------------------------------------------

describe("parsePathStepImpact", () => {
  it("accepts a valid payload and returns a trimmed copy", () => {
    expect(bus.parsePathStepImpact(validImpact())).not.toBeNull();
  });

  it.each([
    ["null", null],
    ["array", [validImpact()]],
    ["string", "impact"],
    ["wrong version", validImpact({ v: 2 as never })],
    ["wrong action kind", validImpact({ actionKind: "score_change" as never })],
    ["missing impactId", validImpact({ impactId: undefined as never })],
    ["empty impactId", validImpact({ impactId: "   " })],
    ["oversized impactId", validImpact({ impactId: "x".repeat(300) })],
    ["missing pathId", validImpact({ pathId: "" })],
    ["invalid timestamp", validImpact({ at: "not-a-date" })],
    ["unknown pathMode", validImpact({ pathMode: "demo" as never })],
    ["unknown reasonCode", validImpact({ reasonCode: "SCORE_UP" as never })],
    ["oversized title", validImpact({ stepTitle: "t".repeat(300) })],
    ["non-string title", validImpact({ stepTitle: 42 as never })],
    ["missing summaries", validImpact({ before: undefined as never })],
    ["counts as array", validImpact({ after: { ...summary(counts(1, 0, 1), counts(0, 0, 1)), actionable: [1, 0, 1] as never } })],
    [
      "negative count",
      validImpact({
        after: {
          ...summary(counts(1, 0, 1), counts(0, 0, 1)),
          actionable: { total: 0, done: -1, skipped: 0, pending: 1 },
        },
      }),
    ],
    [
      "non-integer count",
      validImpact({
        after: {
          ...summary(counts(1, 0, 1), counts(0, 0, 1)),
          actionable: { total: 2, done: 1.5, skipped: 0, pending: 0.5 },
        },
      }),
    ],
    [
      "inconsistent total",
      validImpact({
        after: {
          ...summary(counts(1, 0, 1), counts(0, 0, 1)),
          actionable: { total: 5, done: 1, skipped: 0, pending: 1 },
        },
      }),
    ],
    [
      "NaN ratio",
      validImpact({
        after: { ...summary(counts(1, 0, 1), counts(0, 0, 1)), completedRatio: NaN },
      }),
    ],
    [
      "Infinity ratio",
      validImpact({
        after: {
          ...summary(counts(1, 0, 1), counts(0, 0, 1)),
          resolvedRatio: Infinity,
        },
      }),
    ],
    [
      "ratio below zero",
      validImpact({
        after: { ...summary(counts(1, 0, 1), counts(0, 0, 1)), completedRatio: -0.5 },
      }),
    ],
    [
      "ratio above one",
      validImpact({
        after: { ...summary(counts(1, 0, 1), counts(0, 0, 1)), completedRatio: 1.5 },
      }),
    ],
    [
      "ratio inconsistent with counts",
      validImpact({
        after: { ...summary(counts(1, 0, 1), counts(0, 0, 1)), completedRatio: 0.9 },
      }),
    ],
  ])("rejects %s", (_label, payload) => {
    expect(bus.parsePathStepImpact(payload)).toBeNull();
  });
});

describe("freshness", () => {
  it("accepts impacts inside the hydrate TTL", () => {
    const impact = bus.parsePathStepImpact(validImpact());
    expect(impact && bus.isFreshPathImpact(impact)).toBe(true);
  });

  it("rejects stale impacts", () => {
    const impact = bus.parsePathStepImpact(
      validImpact({ at: new Date(Date.now() - bus.IMPACT_HYDRATE_TTL_MS - 1).toISOString() }),
    );
    expect(impact && bus.isFreshPathImpact(impact)).toBe(false);
  });

  it("rejects excessively future-dated impacts", () => {
    const impact = bus.parsePathStepImpact(
      validImpact({ at: new Date(Date.now() + 60_000).toISOString() }),
    );
    expect(impact && bus.isFreshPathImpact(impact)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Transport — publish / consume-once / failure isolation
// ---------------------------------------------------------------------------

describe("transport", () => {
  it("publishes valid impacts to storage and event", () => {
    const listener = vi.fn();
    window.addEventListener(bus.IMPACT_EVENT_NAME, listener);
    const impact = bus.parsePathStepImpact(validImpact())!;
    bus.publishPathImpact(impact);
    window.removeEventListener(bus.IMPACT_EVENT_NAME, listener);

    expect(listener).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(window.sessionStorage.getItem(bus.LAST_IMPACT_KEY)!);
    expect(stored).toEqual(impact);
  });

  it("refuses to publish an invalid impact", () => {
    const listener = vi.fn();
    window.addEventListener(bus.IMPACT_EVENT_NAME, listener);
    bus.publishPathImpact(validImpact({ v: 3 as never }) as never);
    window.removeEventListener(bus.IMPACT_EVENT_NAME, listener);
    expect(listener).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(bus.LAST_IMPACT_KEY)).toBeNull();
  });

  it("consume returns the stored impact once — the key is gone afterwards", () => {
    const impact = bus.parsePathStepImpact(validImpact())!;
    window.sessionStorage.setItem(bus.LAST_IMPACT_KEY, JSON.stringify(impact));
    const first = bus.consumeStoredPathImpact();
    expect(first?.impactId).toBe(impact.impactId);
    expect(window.sessionStorage.getItem(bus.LAST_IMPACT_KEY)).toBeNull();
    expect(bus.consumeStoredPathImpact()).toBeNull();
  });

  it.each([
    ["malformed JSON", "{not json"],
    ["wrong version", JSON.stringify(validImpact({ v: 9 as never }))],
    ["array payload", JSON.stringify([validImpact()])],
  ])("removes and swallows %s", (_label, raw) => {
    window.sessionStorage.setItem(bus.LAST_IMPACT_KEY, raw);
    expect(bus.consumeStoredPathImpact()).toBeNull();
    expect(window.sessionStorage.getItem(bus.LAST_IMPACT_KEY)).toBeNull();
  });

  it("removes stale stored impacts instead of hydrating them", () => {
    const stale = validImpact({
      at: new Date(Date.now() - bus.IMPACT_HYDRATE_TTL_MS - 1000).toISOString(),
    });
    window.sessionStorage.setItem(bus.LAST_IMPACT_KEY, JSON.stringify(stale));
    expect(bus.consumeStoredPathImpact()).toBeNull();
    expect(window.sessionStorage.getItem(bus.LAST_IMPACT_KEY)).toBeNull();
  });

  it("clears the legacy pre-versioned key alongside the v1 key", () => {
    window.sessionStorage.setItem(bus.LEGACY_LAST_IMPACT_KEY, "{}");
    window.sessionStorage.setItem(bus.LAST_IMPACT_KEY, "{}");
    bus.clearStoredPathImpact();
    expect(window.sessionStorage.getItem(bus.LAST_IMPACT_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(bus.LEGACY_LAST_IMPACT_KEY)).toBeNull();
  });

  it("storage set failure still dispatches the event", () => {
    const listener = vi.fn();
    window.addEventListener(bus.IMPACT_EVENT_NAME, listener);
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });
    bus.publishPathImpact(bus.parsePathStepImpact(validImpact())!);
    spy.mockRestore();
    window.removeEventListener(bus.IMPACT_EVENT_NAME, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("storage get failure fails safely", () => {
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });
    expect(bus.consumeStoredPathImpact()).toBeNull();
    spy.mockRestore();
  });

  it("storage remove failure does not crash", () => {
    const spy = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });
    expect(() => bus.clearStoredPathImpact()).not.toThrow();
    spy.mockRestore();
  });

  it("event dispatch failure never undoes the Path completion", () => {
    seedPath(makePath([makeStep({ id: "s1" })]));
    const spy = vi
      .spyOn(window, "dispatchEvent")
      .mockImplementation(() => {
        throw new Error("dispatch blocked");
      });
    const result = bus.completePathStepWithImpact("s1");
    spy.mockRestore();
    expect(result.kind).toBe("completed_notified");
    expect(storedPath().steps[0].status).toBe("done");
  });
});

// ---------------------------------------------------------------------------
// Toast copy — decision table, no score language
// ---------------------------------------------------------------------------

describe("pathImpactToastCopy", () => {
  const BANNED = [
    /readiness \+/i,
    /score/i,
    /locked in/i,
    /saved everywhere/i,
    /synced/i,
    /no path progress/i,
    /guaranteed/i,
    /homework/i,
  ];

  function expectClean(copy: { title: string; body: string }) {
    for (const pattern of BANNED) {
      expect(copy.title).not.toMatch(pattern);
      expect(copy.body).not.toMatch(pattern);
    }
  }

  it("intermediate completion: counts + next step, honest 'marked complete'", () => {
    const copy = bus.pathImpactToastCopy(
      bus.parsePathStepImpact(
        validImpact({
          stepTitle: "Stabilize runway",
          nextActionableTitle: "Rebuild credit history",
          after: summary(counts(1, 0, 2), counts(0, 0, 1)),
        }),
      )!,
    );
    expect(copy.title).toBe("Step marked complete");
    expect(copy.body).toContain("“Stabilize runway”");
    expect(copy.body).toContain("1 of 3 protective steps marked complete.");
    expect(copy.body).toContain("Next: Rebuild credit history.");
    expectClean(copy);
  });

  it("intermediate completion with skips: calm secondary clause", () => {
    const copy = bus.pathImpactToastCopy(
      bus.parsePathStepImpact(
        validImpact({ after: summary(counts(1, 1, 1), counts(0, 0, 1)) }),
      )!,
    );
    expect(copy.title).toBe("Step marked complete");
    expect(copy.body).toContain("1 skipped.");
    expectClean(copy);
  });

  it("all actionable done, reassessment pending: protective-steps copy, no Path-complete claim", () => {
    const copy = bus.pathImpactToastCopy(
      bus.parsePathStepImpact(
        validImpact({ after: summary(counts(2, 0, 0), counts(0, 0, 1)) }),
      )!,
    );
    expect(copy.title).toBe("Protective steps complete");
    expect(copy.body).toContain("Reassess when your real inputs change.");
    expect(copy.body).not.toMatch(/path complete/i);
    expectClean(copy);
  });

  it("resolved with skips: Path reviewed, done and skipped stay distinct", () => {
    const copy = bus.pathImpactToastCopy(
      bus.parsePathStepImpact(
        validImpact({ after: summary(counts(1, 1, 0), counts(0, 0, 1)) }),
      )!,
    );
    expect(copy.title).toBe("Path reviewed");
    expect(copy.body).toContain("1 complete · 1 skipped.");
    expect(copy.body).toContain("Revisit skipped steps");
    expect(copy.body).toContain("Reassess when your real inputs change.");
    expectClean(copy);
  });

  it("every step done: Path steps complete, no score implication", () => {
    const copy = bus.pathImpactToastCopy(
      bus.parsePathStepImpact(
        validImpact({ after: summary(counts(2, 0, 0), counts(1, 0, 0)) }),
      )!,
    );
    expect(copy.title).toBe("Path steps complete");
    expectClean(copy);
  });

  it("skipped reassessment never yields an all-complete claim", () => {
    const copy = bus.pathImpactToastCopy(
      bus.parsePathStepImpact(
        validImpact({ after: summary(counts(2, 0, 0), counts(0, 1, 0)) }),
      )!,
    );
    expect(copy.title).toBe("Protective steps complete");
    expect(copy.title).not.toMatch(/path steps complete/i);
    expectClean(copy);
  });

  it("ready_optional: maintenance language, no 'more ready' implication", () => {
    const copy = bus.pathImpactToastCopy(
      bus.parsePathStepImpact(
        validImpact({
          pathMode: "ready_optional",
          reasonCode: "MAINTENANCE",
          after: summary(counts(1, 0, 0), counts(0, 0, 0)),
        }),
      )!,
    );
    expect(copy.title).toBe("Maintenance step complete");
    expect(copy.body).not.toMatch(/more ready|readiness improved/i);
    expectClean(copy);
  });
});
