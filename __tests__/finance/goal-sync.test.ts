/**
 * Goals carry the readiness picture — liquid savings comes from the emergency
 * reserves, down-payment progress from the home goals — so the cases pinned
 * here are the ones that would strand or overwrite one.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mergeRemoteGoals, reconcileGoals } from "@/lib/finance/goal-sync";
import { SYNCED_DELETED_USER_ID, SYNCED_USER_ID } from "@/lib/finance/ledger-sync";
import {
  emptyBudgetLedger,
  loadBudgetLedger,
  saveBudgetLedger,
  LOCAL_USER_ID,
} from "@/lib/finance/local-ledger";
import type { SavingsGoal } from "@/lib/finance/ledger";
import type { MoneyCents } from "@/lib/finance/money";

const NOW = "2026-08-11T00:00:00.000Z";
const LATER = "2026-08-12T00:00:00.000Z";
const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

function goal(partial: Partial<SavingsGoal> & Pick<SavingsGoal, "id">): SavingsGoal {
  return {
    userId: LOCAL_USER_ID,
    name: "Emergency reserve",
    goalType: "emergency_reserve",
    targetAmountCents: 900000 as MoneyCents,
    currentAmountCents: 250000 as MoneyCents,
    targetDate: null,
    plannedMonthlyContributionCents: 50000 as MoneyCents,
    linkedDecisionId: null,
    linkedAccountId: null,
    status: "active",
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

function stubStorage(): void {
  const backing = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => backing.get(k) ?? null,
      setItem: (k: string, v: string) => void backing.set(k, v),
      removeItem: (k: string) => void backing.delete(k),
    },
  });
}

function stubFetch(
  handler: (url: string, init?: RequestInit) => { status: number; body?: unknown },
) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal("fetch", (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    const { status, body } = handler(url, init);
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body ?? {}),
    } as Response);
  });
  return calls;
}

function serverHas(goals: SavingsGoal[]) {
  return (url: string) => {
    if (url.includes("savings-goals")) {
      return { status: 200, body: { goals, goal: goals[0] ?? null } };
    }
    return { status: 200, body: {} };
  };
}

function seed(goals: SavingsGoal[]): void {
  saveBudgetLedger({ ...emptyBudgetLedger(NOW), goals });
}

describe("mergeRemoteGoals", () => {
  it("pushes a goal the server has never seen", () => {
    const r = mergeRemoteGoals([goal({ id: ID_A })], []);
    expect(r.goals).toHaveLength(1);
    expect(r.toPush).toEqual([ID_A]);
  });

  it("adopts a goal made on another device without pushing it back", () => {
    const remote = goal({ id: ID_B, userId: "server-uuid", name: "Deposit" });
    const r = mergeRemoteGoals([], [remote]);
    expect(r.goals).toHaveLength(1);
    expect(r.toPush).toEqual([]);
  });

  it("keeps the newer edit when both sides changed", () => {
    const local = goal({ id: ID_A, name: "Local edit", updatedAt: LATER });
    const remote = goal({ id: ID_A, name: "Server copy", updatedAt: NOW });
    const r = mergeRemoteGoals([local], [remote]);
    expect(r.goals[0]?.name).toBe("Local edit");
    expect(r.toPush).toEqual([ID_A]);
  });

  it("takes the server copy when it is newer, and does not push over it", () => {
    const local = goal({ id: ID_A, name: "Stale", updatedAt: NOW });
    const remote = goal({ id: ID_A, name: "Newer", updatedAt: LATER });
    const r = mergeRemoteGoals([local], [remote]);
    expect(r.goals[0]?.name).toBe("Newer");
    expect(r.toPush).toEqual([]);
  });
});

describe("reconcileGoals", () => {
  beforeEach(stubStorage);
  afterEach(() => vi.unstubAllGlobals());

  it("pushes a local goal under its own id and marks it", async () => {
    seed([goal({ id: ID_A })]);
    const calls = stubFetch(serverHas([]));

    const state = await reconcileGoals(NOW);

    const puts = calls.filter((c) => c.method === "PUT");
    expect(puts).toHaveLength(1);
    expect(puts[0]?.body).toMatchObject({
      id: ID_A,
      goal_type: "emergency_reserve",
      target_amount: 9000,
      current_amount: 2500,
    });
    expect(state.goals[0]?.userId).toBe(SYNCED_USER_ID);
  });

  it("does not re-push a goal the server already matches", async () => {
    const synced = goal({ id: ID_A, userId: SYNCED_USER_ID });
    seed([synced]);
    const calls = stubFetch(serverHas([synced]));

    await reconcileGoals(NOW);
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(0);
  });

  /** A reserve and a deposit are not competing rows — both must reach the server. */
  it("pushes several goals of different types", async () => {
    seed([
      goal({ id: ID_A, goalType: "emergency_reserve" }),
      goal({ id: ID_B, goalType: "home", name: "Deposit" }),
    ]);
    const calls = stubFetch(serverHas([]));

    await reconcileGoals(NOW);

    const puts = calls.filter((c) => c.method === "PUT");
    expect(puts).toHaveLength(2);
    expect(puts.map((p) => (p.body as { goal_type: string }).goal_type).sort()).toEqual([
      "emergency_reserve",
      "home",
    ]);
  });

  it("adopts a goal created on another device", async () => {
    seed([]);
    const remote = goal({ id: ID_B, userId: "server-uuid", name: "Deposit", goalType: "home" });
    stubFetch(serverHas([remote]));

    const state = await reconcileGoals(NOW);
    expect(state.goals).toHaveLength(1);
    expect(state.goals[0]?.name).toBe("Deposit");
    expect(loadBudgetLedger(NOW).goals).toHaveLength(1);
  });

  it("archives on the server when the goal was archived here", async () => {
    seed([goal({ id: ID_A, userId: SYNCED_USER_ID, status: "archived" })]);
    const calls = stubFetch(serverHas([]));

    const state = await reconcileGoals(NOW);

    const deletes = calls.filter((c) => c.method === "DELETE");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]?.url).toContain(ID_A);
    expect(state.goals[0]?.userId).toBe(SYNCED_DELETED_USER_ID);
  });

  /** Archived before it ever synced: the server never had it, so say nothing. */
  it("sends no request for a goal archived before it ever reached the server", async () => {
    seed([goal({ id: ID_A, userId: LOCAL_USER_ID, status: "archived" })]);
    const calls = stubFetch(serverHas([]));

    const state = await reconcileGoals(NOW);
    expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(0);
    expect(state.goals[0]?.userId).toBe(SYNCED_DELETED_USER_ID);
  });

  it("stops on 401 rather than firing a request per goal", async () => {
    seed([goal({ id: ID_A }), goal({ id: ID_B })]);
    // Discriminate on method: the PUT carries its id in the body, not the URL.
    const calls = stubFetch((_url, init) => {
      if ((init?.method ?? "GET") === "GET") return { status: 200, body: { goals: [] } };
      return { status: 401, body: { error: "Not authenticated." } };
    });

    await reconcileGoals(NOW);
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(1);
  });

  it("leaves the local goals alone when the pull fails", async () => {
    seed([goal({ id: ID_A })]);
    stubFetch(() => ({ status: 401, body: { error: "Not authenticated." } }));

    const state = await reconcileGoals(NOW);
    expect(state.goals).toHaveLength(1);
    expect(state.goals[0]?.userId).toBe(LOCAL_USER_ID);
  });
});
