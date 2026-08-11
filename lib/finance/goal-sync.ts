/**
 * Local ↔ server sync for savings goals.
 *
 * #189 wired transaction sync and had to leave goals out: the savings-goals
 * route still addressed "the" goal, so pushing a second one would have
 * overwritten the first. #190 fixed that, and this is the piece it unblocked.
 *
 * Goals matter more than their row count suggests. goal-semantics reads liquid
 * savings from the emergency reserves and down-payment progress from the home
 * goals, so a goal that exists only in one browser is a readiness verdict that
 * exists only in one browser.
 *
 * Unlike transactions, goals do not need a dirty marker to propagate edits. The
 * pull runs first and the merge keeps whichever side is newer, so "push what
 * local won" is exactly the set that needs pushing — an edit made here goes out,
 * and an edit made elsewhere is already local by the time we look.
 */

import type { SavingsGoal } from "@/lib/finance/ledger";
import {
  type BudgetLedgerState,
  loadBudgetLedger,
  saveBudgetLedger,
  LOCAL_USER_ID,
} from "@/lib/finance/local-ledger";
import { centsToDollars } from "@/lib/finance/money";
import { SYNCED_USER_ID, SYNCED_DELETED_USER_ID, type PushResult } from "@/lib/finance/ledger-sync";

function isLocalOnly(goal: SavingsGoal): boolean {
  return goal.userId === LOCAL_USER_ID || goal.userId === "local";
}

async function fetchJson(
  input: RequestInfo,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(input, init);
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

/**
 * Last-write-wins merge by id, and the set of local ids that still need to go
 * out: anything the server has never seen, and anything local edited more
 * recently than the server's copy.
 *
 * Pushing only the winners keeps a mount to one request per changed goal
 * rather than one per goal, which matters against a 20/minute write limit.
 */
export function mergeRemoteGoals(
  local: readonly SavingsGoal[],
  remote: readonly SavingsGoal[],
): { goals: SavingsGoal[]; toPush: string[] } {
  const remoteById = new Map(remote.map((g) => [g.id, g]));
  const byId = new Map<string, SavingsGoal>();
  const toPush: string[] = [];

  for (const goal of local) {
    const server = remoteById.get(goal.id);
    if (!server || goal.updatedAt > server.updatedAt) {
      byId.set(goal.id, goal);
      toPush.push(goal.id);
    } else {
      byId.set(goal.id, server);
    }
  }

  // Goals this browser has never seen — another device made them.
  for (const goal of remote) {
    if (!byId.has(goal.id)) byId.set(goal.id, goal);
  }

  return { goals: [...byId.values()], toPush };
}

/** GET the caller's active goals. Null when anonymous or the read failed. */
export async function pullGoalsFromServer(): Promise<SavingsGoal[] | null> {
  if (typeof window === "undefined") return null;
  const res = await fetchJson("/api/finance/savings-goals");
  if (!res.ok) return null;
  const body = res.body as { goals?: SavingsGoal[] } | null;
  return body?.goals ?? [];
}

/**
 * PUT one goal under its own id, so the identity this browser chose is the
 * identity every device uses.
 */
export async function pushGoal(goal: SavingsGoal): Promise<PushResult> {
  if (typeof window === "undefined") return "ok";
  // The route only accepts a UUID id; a goal from the non-crypto id fallback
  // cannot be addressed and would 400 on every attempt.
  if (!/^[0-9a-f-]{36}$/i.test(goal.id)) return "error";

  const res = await fetchJson("/api/finance/savings-goals", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: goal.id,
      name: goal.name,
      goal_type: goal.goalType,
      target_amount: centsToDollars(Number(goal.targetAmountCents)),
      current_amount: centsToDollars(Number(goal.currentAmountCents)),
      target_date: goal.targetDate,
      planned_monthly_contribution: centsToDollars(Number(goal.plannedMonthlyContributionCents)),
    }),
    keepalive: true,
  });

  if (res.status === 401) return "auth";
  if (res.status === 409) return "exists";
  if (res.ok) return "ok";
  return "error";
}

/** Archive one goal server-side. Idempotent. */
export async function pushGoalArchive(goalId: string): Promise<PushResult> {
  if (typeof window === "undefined") return "ok";
  if (!/^[0-9a-f-]{36}$/i.test(goalId)) return "error";

  const res = await fetchJson(`/api/finance/savings-goals?id=${encodeURIComponent(goalId)}`, {
    method: "DELETE",
    keepalive: true,
  });
  if (res.status === 401) return "auth";
  if (res.ok) return "ok";
  return "error";
}

function markGoal(state: BudgetLedgerState, goalId: string, userId: string): BudgetLedgerState {
  return {
    ...state,
    goals: state.goals.map((g) => (g.id === goalId ? { ...g, userId } : g)),
  };
}

/**
 * Pull, merge, then push what local won and archive what local archived.
 *
 * Stops on the first `auth`: a dead session fails every remaining request the
 * same way, and the markers are left untouched so the work goes out next time.
 */
export async function reconcileGoals(nowIso: string): Promise<BudgetLedgerState> {
  const remote = await pullGoalsFromServer();
  let state = loadBudgetLedger(nowIso);
  if (remote === null) return state;

  const merged = mergeRemoteGoals(state.goals, remote);
  state = { ...state, goals: merged.goals };
  saveBudgetLedger(state);

  const pushable = new Set(merged.toPush);

  for (const goal of state.goals) {
    if (goal.status === "active") {
      if (!pushable.has(goal.id)) continue;
      const result = await pushGoal(goal);
      if (result === "auth") return state;
      if (result === "ok" || result === "exists") {
        state = markGoal(state, goal.id, SYNCED_USER_ID);
        saveBudgetLedger(state);
      }
      continue;
    }

    // Archived. Nothing to retract when the server never had it — but stamp it
    // so it is not reconsidered on every future mount.
    if (goal.userId === SYNCED_DELETED_USER_ID) continue;
    if (isLocalOnly(goal)) {
      state = markGoal(state, goal.id, SYNCED_DELETED_USER_ID);
      saveBudgetLedger(state);
      continue;
    }
    const result = await pushGoalArchive(goal.id);
    if (result === "auth") return state;
    if (result === "ok" || result === "exists") {
      state = markGoal(state, goal.id, SYNCED_DELETED_USER_ID);
      saveBudgetLedger(state);
    }
  }

  return state;
}
