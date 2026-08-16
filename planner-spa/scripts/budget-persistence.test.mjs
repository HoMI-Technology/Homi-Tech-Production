/**
 * Quick node test for the defensive budget persistence (store/budget.tsx).
 *
 * Bundles budget.tsx with esbuild (react stubbed — the module only calls
 * createContext at import time) and exercises the pure load/save path
 * against a Map-backed localStorage shim:
 *
 *   1. corrupt blob      → backup key written + seed loads + no crash
 *   2. legacy bare blob  → migrates transparently (rows preserved)
 *   3. one bad row       → row dropped, good rows kept, no backup written
 *   4. save failure      → saveStoredBudget returns false (no throw)
 *   5. round-trip        → envelope { v:1, savedAt, data } reloads intact
 *
 * Run: node scripts/budget-persistence.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "budget-persist-")),
  "budget.mjs",
);

/* react is imported by budget.tsx but never executed at module scope beyond
 * createContext — a minimal stub keeps the bundle importable in node. */
const reactStub = {
  name: "react-stub",
  setup(b) {
    b.onResolve({ filter: /^react(\/jsx-runtime)?$/ }, (args) => ({
      path: args.path,
      namespace: "stub",
    }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: `
        export const createContext = () => ({ Provider: () => null, Consumer: () => null });
        export const useCallback = (fn) => fn;
        export const useContext = () => null;
        export const useEffect = () => {};
        export const useMemo = (fn) => fn();
        export const useRef = (v) => ({ current: v });
        export const useState = (v) => [typeof v === "function" ? v() : v, () => {}];
        export const Fragment = Symbol("Fragment");
        export const jsx = () => null;
        export const jsxs = () => null;
        export default {};
      `,
      loader: "js",
    }));
  },
};

await build({
  entryPoints: [path.join(ROOT, "src/store/budget.tsx")],
  outfile: OUT,
  bundle: true,
  format: "esm",
  platform: "neutral",
  jsx: "automatic",
  plugins: [reactStub],
  logLevel: "silent",
});

const budget = await import(pathToFileURL(OUT).href);
const {
  STORAGE_KEY,
  CORRUPT_BACKUP_KEY,
  buildSeed,
  loadStoredBudget,
  saveStoredBudget,
} = budget;

/* Map-backed localStorage + window shim. */
function installStorage({ throwOnWrite = false } = {}) {
  const map = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => {
        if (throwOnWrite) {
          const err = new Error("QuotaExceededError");
          err.name = "QuotaExceededError";
          throw err;
        }
        map.set(k, String(v));
      },
      removeItem: (k) => map.delete(k),
    },
  };
  return map;
}

const now = new Date("2025-06-15T12:00:00");
let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  ok — ${name}`);
}

/* 1 — corrupt blob: backup written, seed loads, no crash. */
{
  const map = installStorage();
  map.set(STORAGE_KEY, "{not valid json at all,,,");
  const result = loadStoredBudget(now);
  assert.equal(result.recoveredFromCorruption, true, "recovery flag set");
  assert.equal(
    map.get(CORRUPT_BACKUP_KEY),
    "{not valid json at all,,,",
    "raw blob preserved under the backup key",
  );
  const seed = buildSeed(now);
  assert.equal(result.state.transactions.length, seed.transactions.length, "seed loads");
  assert.equal(result.state.monthlyDebtPayments, seed.monthlyDebtPayments);
  ok("corrupt blob → backup key written + seed loads + no crash");
}

/* 2 — legacy unwrapped blob migrates transparently. */
{
  const map = installStorage();
  const legacy = buildSeed(now);
  legacy.monthlyDebtPayments = 700;
  map.set(STORAGE_KEY, JSON.stringify(legacy)); // bare BudgetState, no envelope
  const result = loadStoredBudget(now);
  assert.equal(result.recoveredFromCorruption, false);
  assert.equal(map.has(CORRUPT_BACKUP_KEY), false, "no backup on clean load");
  assert.equal(result.state.monthlyDebtPayments, 700, "legacy data preserved");
  assert.equal(result.state.transactions.length, legacy.transactions.length);
  ok("legacy bare blob migrates transparently");
}

/* 3 — one corrupted transaction row is dropped, good rows survive. */
{
  const map = installStorage();
  const seed = buildSeed(now);
  const bad = { id: "tx-bad", type: "expense", amount: "lots", date: "2025-06-10" };
  const data = { ...seed, transactions: [seed.transactions[0], bad, seed.transactions[1]] };
  map.set(STORAGE_KEY, JSON.stringify({ v: 1, savedAt: seed.savedAt, data }));
  const result = loadStoredBudget(now);
  assert.equal(result.recoveredFromCorruption, false, "row-level corruption is not fatal");
  assert.equal(map.has(CORRUPT_BACKUP_KEY), false, "no backup for dropped rows");
  assert.equal(result.state.transactions.length, 2, "bad row dropped, good rows kept");
  ok("per-row guard drops the corrupted transaction");
}

/* 4 — save failure (quota / Safari private mode) reports false. */
{
  installStorage({ throwOnWrite: true });
  const seed = buildSeed(now);
  assert.equal(saveStoredBudget(seed), false, "failure reported, not swallowed");
  ok("save failure returns false");
}

/* 5 — envelope round-trip preserves state. */
{
  const map = installStorage();
  const seed = buildSeed(now);
  seed.monthlyDebtPayments = 812;
  assert.equal(saveStoredBudget(seed), true);
  const stored = JSON.parse(map.get(STORAGE_KEY));
  assert.equal(stored.v, 1, "versioned envelope written");
  assert.equal(typeof stored.savedAt, "string");
  const result = loadStoredBudget(now);
  assert.equal(result.state.monthlyDebtPayments, 812);
  assert.equal(result.state.goals.length, seed.goals.length);
  ok("envelope { v:1, savedAt, data } round-trips");
}

console.log(`budget-persistence: ${passed}/5 checks passed`);
