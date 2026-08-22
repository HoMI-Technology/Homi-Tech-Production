// @vitest-environment jsdom
/**
 * Planner store persistence hardening — ported from the Vite reference
 * build's budget-persistence.test.mjs (+ the persistence assertions of
 * planner-store.test.mjs), retargeted at this repo's versioned-envelope
 * zustand persist (lib/planner/store.ts).
 *
 * Pinned contracts:
 *   1. Writes land as an envelope { v, savedAt, data } under
 *      homi-planner-v1 (data is zustand's own { state, version }).
 *   2. Forward-only migration walker: older envelopes load (unknown
 *      ancient shapes pass through to the merge guards).
 *   3. Legacy bare zustand blobs (pre-envelope) load transparently.
 *   4. A corrupt blob is preserved under homi-planner-v1-corrupt and
 *      hydration falls back to the clean initial state — never destroyed,
 *      never a crash.
 *   5. sanitizePersistedPath drops corrupt path snapshots (bad steps /
 *      unknown verdict) so Overview can never crash on rehydrate.
 *   6. stripNonFinite keeps NaN / ±Infinity out of persisted state at the
 *      action boundaries.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PLANNER_CORRUPT_BACKUP_KEY,
  PLANNER_SCHEMA_VERSION,
  PLANNER_STORAGE_KEY,
  usePlannerStore,
} from "@/lib/planner/store";
import type { PathSnapshot, Transaction } from "@/lib/planner/types";

// addTransaction mints its own tx_<uuid> id, so identify the row by note.
const demoTx: Omit<Transaction, "id"> = {
  type: "expense",
  amount: 25,
  category: "food",
  note: "Sandwich",
  date: "2031-01-02",
  source: "manual",
};

const validPath: PathSnapshot = {
  id: "path_persist",
  createdAt: "2031-01-02T00:00:00.000Z",
  score: 73,
  verdict: "ALMOST_THERE",
  bindingConstraint: null,
  mode: "build",
  steps: [],
};

function writeEnvelope(state: Record<string, unknown>, v = PLANNER_SCHEMA_VERSION) {
  window.localStorage.setItem(
    PLANNER_STORAGE_KEY,
    JSON.stringify({
      v,
      savedAt: new Date("2031-01-02T12:00:00Z").toISOString(),
      data: { state, version: PLANNER_SCHEMA_VERSION },
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  usePlannerStore.getState().clearWorkspace();
});

describe("versioned envelope writes", () => {
  it("persists { v, savedAt, data } under homi-planner-v1", () => {
    usePlannerStore.getState().addTransaction(demoTx);

    const raw = window.localStorage.getItem(PLANNER_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw ?? "{}") as {
      v: number;
      savedAt: string;
      data: { state: { transactions: Transaction[] }; version: number };
    };
    expect(parsed.v).toBe(PLANNER_SCHEMA_VERSION);
    expect(typeof parsed.savedAt).toBe("string");
    expect(parsed.data.version).toBe(PLANNER_SCHEMA_VERSION);
    expect(parsed.data.state.transactions).toHaveLength(1);
    expect(parsed.data.state.transactions[0]?.amount).toBe(25);
  });
});

describe("loads and migrations", () => {
  it("round-trips an envelope intact across a simulated reload", async () => {
    usePlannerStore.getState().addTransaction(demoTx);
    const saved = window.localStorage.getItem(PLANNER_STORAGE_KEY);
    expect(saved).toBeTruthy();

    // Simulate a page reload: in-memory state cleared, stored bytes intact.
    usePlannerStore.getState().clearWorkspace();
    expect(usePlannerStore.getState().transactions).toHaveLength(0);
    window.localStorage.setItem(PLANNER_STORAGE_KEY, saved ?? "");

    await usePlannerStore.persist.rehydrate();
    const tx = usePlannerStore.getState().transactions.find((t) => t.note === "Sandwich");
    expect(tx?.amount).toBe(25);
    expect(window.localStorage.getItem(PLANNER_CORRUPT_BACKUP_KEY)).toBeNull();
  });

  it("loads legacy bare zustand blobs (pre-envelope) transparently", async () => {
    window.localStorage.setItem(
      PLANNER_STORAGE_KEY,
      JSON.stringify({
        state: {
          transactions: [{ ...demoTx, id: "tx_legacy", amount: 42 }],
          savingsGoal: { name: "Emergency fund", target: 9000, current: 500 },
        },
        version: PLANNER_SCHEMA_VERSION,
      }),
    );

    await usePlannerStore.persist.rehydrate();
    const s = usePlannerStore.getState();
    expect(s.transactions[0]?.id).toBe("tx_legacy");
    expect(s.transactions[0]?.amount).toBe(42);
    expect(s.savingsGoal.target).toBe(9000);
    expect(window.localStorage.getItem(PLANNER_CORRUPT_BACKUP_KEY)).toBeNull();
  });

  it("walks the forward-only migration chain for older envelopes", async () => {
    // v:0 predates the current schema; the chain has no 0→1 step yet, so
    // the walker passes the data through to the merge guards (which accept
    // well-formed slices). A future v2 adds PLANNER_MIGRATIONS[1].
    writeEnvelope({ transactions: [{ ...demoTx, id: "tx-v0" }] }, 0);

    await usePlannerStore.persist.rehydrate();
    expect(usePlannerStore.getState().transactions[0]?.id).toBe("tx-v0");
    expect(window.localStorage.getItem(PLANNER_CORRUPT_BACKUP_KEY)).toBeNull();
  });
});

describe("corrupt blob recovery", () => {
  it("preserves the raw blob under the backup key and falls back clean", async () => {
    const corrupt = "{not valid json at all,,,";
    window.localStorage.setItem(PLANNER_STORAGE_KEY, corrupt);

    await usePlannerStore.persist.rehydrate();

    // Never destroyed — the raw bytes survive under the backup key.
    expect(window.localStorage.getItem(PLANNER_CORRUPT_BACKUP_KEY)).toBe(corrupt);
    // Clean reseed: initial empty state, and hydration still completes.
    const s = usePlannerStore.getState();
    expect(s.transactions).toHaveLength(0);
    expect(s.accounts).toHaveLength(0);
    expect(s.savingsGoal.target).toBe(0);
    expect(s._hasHydrated).toBe(true);
  });

  it("backs up a syntactically valid but non-envelope blob too", async () => {
    const blob = JSON.stringify("not-an-envelope");
    window.localStorage.setItem(PLANNER_STORAGE_KEY, blob);

    await usePlannerStore.persist.rehydrate();
    expect(window.localStorage.getItem(PLANNER_CORRUPT_BACKUP_KEY)).toBe(blob);
    expect(usePlannerStore.getState().transactions).toHaveLength(0);
  });
});

describe("sanitizePersistedPath", () => {
  it("drops a path blob without a steps array", async () => {
    writeEnvelope({ path: { bogus: true } });
    await usePlannerStore.persist.rehydrate();
    expect(usePlannerStore.getState().path).toBeNull();
  });

  it("drops a path blob with an unknown verdict", async () => {
    writeEnvelope({ path: { ...validPath, verdict: "NOT_A_VERDICT" } });
    await usePlannerStore.persist.rehydrate();
    expect(usePlannerStore.getState().path).toBeNull();
  });

  it("keeps a well-formed path snapshot", async () => {
    writeEnvelope({ path: validPath });
    await usePlannerStore.persist.rehydrate();
    expect(usePlannerStore.getState().path?.id).toBe("path_persist");
  });
});

describe("stripNonFinite at the action boundaries", () => {
  it("rejects non-finite transaction amounts entirely", () => {
    const before = usePlannerStore.getState().transactions.length;
    usePlannerStore.getState().addTransaction({ ...demoTx, amount: Number.NaN });
    usePlannerStore.getState().addTransaction({ ...demoTx, amount: Number.POSITIVE_INFINITY });
    expect(usePlannerStore.getState().transactions).toHaveLength(before);
  });

  it("strips non-finite keys from patches instead of persisting them", () => {
    usePlannerStore.getState().addTransaction(demoTx);
    const id = usePlannerStore.getState().transactions[0]?.id ?? "tx_missing";

    usePlannerStore.getState().updateTransaction(id, { amount: Number.NaN });
    // The ledger bridge re-keys the row on update; find by note. What is
    // pinned: the NaN never landed, the row survived with its amount.
    const tx = usePlannerStore.getState().transactions.find((t) => t.note === "Sandwich");
    expect(tx?.amount).toBe(25);

    usePlannerStore.getState().setSavingsGoal({ target: 12000 });
    usePlannerStore.getState().setSavingsGoal({ target: Number.POSITIVE_INFINITY });
    expect(usePlannerStore.getState().savingsGoal.target).toBe(12000);
  });

  it("rejects non-finite bill amounts", () => {
    const before = usePlannerStore.getState().bills.length;
    usePlannerStore.getState().addBill({
      name: "Bogus",
      amount: Number.NaN,
      category: "utilities",
      dueDate: "2031-01-15",
      frequency: "monthly",
      autopay: false,
    });
    expect(usePlannerStore.getState().bills).toHaveLength(before);
  });
});
