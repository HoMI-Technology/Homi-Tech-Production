/**
 * Closed-loop verification — ported from the Vite reference build's
 * planner-closed-loop.test.mjs acceptance suite, rewired to this repo's
 * async server-score seam.
 *
 * The scoring network is mocked (same pattern as score-bridge.test.ts) at
 * the demo's screenshot canon: Decision Readiness Score 73 · ALMOST_THERE · pillars
 * 74/66/80 (totals 26/35, 23/35, 24/30). WEIGHTS is never imported here.
 *
 * Pinned contracts:
 *   1. snapshot-before → mutate → ScoreImpact after
 *   2. completePathStepWithImpact NEVER calls regeneratePath (a rebuild
 *      would wipe the completion it just stamped)
 *   3. flat delta (|Δ| < 0.5) → progress-first copy, never shame copy
 *   4. hard-stop detail looks up the canon message from the payload
 *   5. payBillWithImpact sets lastImpact with actionKind "bill_paid"
 *   6. stale async responses are discarded by the seq guard
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchServerScore } from "@/lib/scoring/client-score";
import type { ServerScorePayload } from "@/lib/scoring/client-score";
import type { AssessmentResult } from "@/lib/scoring/public";
import { buildDemoSeed } from "@/lib/planner/derived";
import { scoreFromBudgetAsync } from "@/lib/planner/score-bridge";
import { usePlannerStore } from "@/lib/planner/store";
import {
  addCheckinWithImpact,
  completePathStepWithImpact,
  payBillWithImpact,
  withScoreImpact,
} from "@/lib/planner/closed-loop";
import type { PathSnapshot, PathStepSnapshot } from "@/lib/planner/types";

vi.mock("@/lib/scoring/client-score", () => ({
  fetchServerScore: vi.fn(),
  ScoringRequestError: class ScoringRequestError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

const mockedFetch = vi.mocked(fetchServerScore);

/** Screenshot canon: 73 ALMOST_THERE with pillar totals 26/23/24 → 74/66/80. */
function canonPayload(
  over: {
    score?: number;
    verdict?: AssessmentResult["verdict"];
    hardStops?: AssessmentResult["hardStops"];
  } = {},
): ServerScorePayload {
  return {
    result: {
      score: over.score ?? 73,
      verdict: over.verdict ?? "ALMOST_THERE",
      financial: { debtToIncome: 9, downPayment: 6, emergencyFund: 5, creditHealth: 6, total: 26 },
      emotional: {
        lifeStability: 6,
        confidenceLevel: 6,
        partnerAlignment: 6,
        fomoCheck: 5,
        total: 23,
        singleRedistribution: false,
      },
      timing: { timeHorizon: 8, savingsRate: 9, downPaymentProgress: 7, total: 24 },
      warnings: [],
      hardStops: over.hardStops ?? [],
    },
    keyInsight: "Runway is the binding lever.",
    nextSteps: ["Pay the student loan on time"],
  };
}

const DEMO_DATE = new Date("2031-01-02T12:00:00");

/**
 * Seed the store with the demo workspace + a completed profile. Vary the
 * credit score per test so the score-bridge cache key never collides
 * across tests (fetchServerScoreCached holds a 45s TTL).
 */
function seedStore(creditScore = 750) {
  const seed = buildDemoSeed(DEMO_DATE);
  usePlannerStore.setState({
    ...seed,
    readinessProfile: { ...seed.readinessProfile, creditScore, profileComplete: true },
  });
  return seed;
}

function makeStep(id: string, title: string): PathStepSnapshot {
  return {
    id,
    title,
    kind: "milestone",
    daysFromNow: 30,
    reasonCode: "PILLAR_FINANCIAL",
    notes: "",
    fundingTarget: null,
    fundingLabel: null,
    status: "pending",
    completedAt: null,
  };
}

function makePath(): PathSnapshot {
  return {
    id: "path_test",
    createdAt: "2031-01-02T00:00:00.000Z",
    score: 73,
    verdict: "ALMOST_THERE",
    bindingConstraint: "PILLAR_FINANCIAL",
    mode: "build",
    steps: [
      makeStep("s1", "Build the buffer"),
      makeStep("s2", "Trim the card balance"),
      makeStep("s3", "Reconfirm the timeline"),
    ],
  };
}

const realRegeneratePath = usePlannerStore.getState().regeneratePath;

beforeEach(() => {
  mockedFetch.mockReset();
  mockedFetch.mockResolvedValue(canonPayload());
  usePlannerStore.setState({
    regeneratePath: realRegeneratePath,
    path: null,
    lastImpact: null,
  });
});

describe("server-score seam at demo canon", () => {
  it("pins 73 · ALMOST_THERE · pillars 74/66/80 on the demo seed", async () => {
    const seed = buildDemoSeed(DEMO_DATE);
    const score = await scoreFromBudgetAsync({
      transactions: seed.transactions,
      accounts: seed.accounts,
      bills: seed.bills,
      holdings: seed.holdings,
      netWorthItems: seed.netWorthItems,
      savingsGoal: seed.savingsGoal,
      readinessProfile: { ...seed.readinessProfile, profileComplete: true },
    });
    expect(score.score).toBe(73);
    expect(score.verdict).toBe("ALMOST_THERE");
    expect(score.pillarPct).toEqual({ financial: 74, emotional: 66, timing: 80 });
    expect(score.hardStops).toEqual([]);
  });
});

describe("payBillWithImpact — snapshot before → mutate → impact after", () => {
  it("pays the bill, moves cash, sets lastImpact, regenerates the path", async () => {
    const seed = seedStore();
    const regen = vi.fn(async () => {});
    usePlannerStore.setState({ path: makePath(), regeneratePath: regen });

    const res = await payBillWithImpact("bill-demo-rent", "acct-demo-checking");
    expect(res.ok).toBe(true);
    expect(res.impact).not.toBeNull();
    expect(res.impact?.fromScore).toBe(73);
    expect(res.impact?.toScore).toBe(73);
    expect(res.impact?.actionKind).toBe("bill_paid");

    const s = usePlannerStore.getState();
    expect(s.bills.find((b) => b.id === "bill-demo-rent")?.status).toBe("paid");
    // 4,280.42 − 1,850 rent, rounded at the action boundary.
    expect(s.accounts.find((a) => a.id === "acct-demo-checking")?.balance).toBe(2430.42);
    // A bill-pay expense hit the ledger.
    expect(s.transactions.length).toBe(seed.transactions.length + 1);
    // Bill pay may clear runway/DTI constraints → path sequence refreshes.
    expect(regen).toHaveBeenCalledTimes(1);
    // lastImpact carries the toast payload with the action kind.
    expect(s.lastImpact?.actionKind).toBe("bill_paid");
    expect(s.lastImpact?.reason).toBe("Bill paid");
  });

  it("returns ok:false with no impact when the action fails", async () => {
    seedStore(736);
    const res = await withScoreImpact("Bill paid", () =>
      usePlannerStore.getState().payBill("bill-demo-rent", "acct-does-not-exist"),
    );
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Select a pay-from account");
    expect(res.impact).toBeNull();
    expect(usePlannerStore.getState().lastImpact).toBeNull();
  });
});

describe("completePathStepWithImpact — never regenerates the path", () => {
  it("stamps completion without a rebuild, with progress-first flat copy", async () => {
    seedStore();
    const regen = vi.fn(async () => {});
    usePlannerStore.setState({ path: makePath(), regeneratePath: regen });

    const res = await completePathStepWithImpact("s1");
    expect(res.ok).toBe(true);
    // THE contract: completing a step must not rebuild the path (a rebuild
    // would wipe the completion it just stamped).
    expect(regen).not.toHaveBeenCalled();

    const s = usePlannerStore.getState();
    expect(s.path?.steps).toHaveLength(3);
    expect(s.path?.steps[0]?.status).toBe("done");
    expect(s.path?.steps[0]?.completedAt).not.toBeNull();

    // Score is flat (mock returns 73 both sides) → progress-first copy.
    expect(res.impact?.delta).toBe(0);
    expect(res.impact?.pathProgress).toEqual({ before: 0, after: 1 / 3 });
    expect(res.impact?.headline).toBe("Step locked in");
    expect(res.impact?.detail).toContain('"Build the buffer" · Path 33% complete.');
    expect(res.impact?.nextHint).toBe("Next: Trim the card balance");
    expect(s.lastImpact?.stepTitle).toBe("Build the buffer");
  });

  it("says 'Path steps complete' when the last step locks in", async () => {
    seedStore(731);
    usePlannerStore.setState({ path: makePath() });

    await completePathStepWithImpact("s1");
    await completePathStepWithImpact("s2");
    const res = await completePathStepWithImpact("s3");
    expect(res.impact?.pathProgress).toEqual({ before: 2 / 3, after: 1 });
    expect(res.impact?.headline).toBe("Path steps complete");
    expect(res.impact?.detail).toContain("Protective homework on this path is clear.");
  });

  it("skip copy never claims readiness for avoidance", async () => {
    seedStore(732);
    usePlannerStore.setState({ path: makePath() });

    const res = await completePathStepWithImpact("s2", "skipped");
    expect(res.ok).toBe(true);
    expect(res.impact?.headline).toBe("Step skipped — path stays truthful");
    expect(res.impact?.detail).toContain("marked skipped. No readiness claim for avoidance.");
    expect(usePlannerStore.getState().path?.steps[1]?.status).toBe("skipped");
  });

  it("short-circuits already-done steps with no toast noise", async () => {
    seedStore(734);
    usePlannerStore.setState({ path: makePath() });

    const first = await completePathStepWithImpact("s1");
    expect(first.impact).not.toBeNull();
    const stamped = usePlannerStore.getState().path?.steps[0]?.completedAt;

    const again = await completePathStepWithImpact("s1");
    expect(again).toEqual({ ok: true, impact: null });
    // No store rewrite, no toast churn.
    expect(usePlannerStore.getState().path?.steps[0]?.completedAt).toBe(stamped);
    expect(usePlannerStore.getState().lastImpact?.stepTitle).toBe("Build the buffer");
  });

  it("no path → ok:false, no impact", async () => {
    seedStore(735);
    usePlannerStore.setState({ path: null });
    const res = await completePathStepWithImpact("s1");
    expect(res).toEqual({ ok: false, impact: null });
  });
});

describe("hard-stop honesty", () => {
  it("surfaces the canon hard-stop message when one appears", async () => {
    seedStore(742);
    let call = 0;
    mockedFetch.mockImplementation(async () => {
      call += 1;
      // before: clean 73 · after: a hard-stop appears, score dips
      return call === 1
        ? canonPayload()
        : canonPayload({
            score: 70,
            hardStops: [
              { code: "CREDIT_UNDER_620", message: "Credit band under 620 — protection first." },
            ],
          });
    });

    const res = await addCheckinWithImpact(6, "tight month");
    expect(res.ok).toBe(true);
    expect(res.impact?.hardStopsAdded).toBe(1);
    expect(res.impact?.headline).toBe("New hard-stop surfaced — honesty before speed");
    // The detail looks the message up from the canon payload, verbatim.
    expect(res.impact?.detail).toContain("New stop: Credit band under 620 — protection first.");
  });
});

describe("stale-response guard", () => {
  it("discards an impact when a newer closed-loop started mid-flight", async () => {
    seedStore(733);
    const pending: Array<(p: ServerScorePayload) => void> = [];
    mockedFetch.mockImplementation(
      () =>
        new Promise<ServerScorePayload>((resolve) => {
          pending.push(resolve);
        }),
    );

    const first = withScoreImpact("First action", () => {});
    const second = withScoreImpact("Second action", () => {});
    // Identical inputs → both before-snapshots share one in-flight request.
    expect(pending).toHaveLength(1);
    pending[0]?.(canonPayload());

    const [a, b] = await Promise.all([first, second]);
    expect(a.ok).toBe(true);
    // The older loop resolves stale: no impact, no lastImpact write.
    expect(a.impact).toBeNull();
    expect(b.impact).not.toBeNull();
    expect(usePlannerStore.getState().lastImpact?.reason).toBe("Second action");
  });
});
