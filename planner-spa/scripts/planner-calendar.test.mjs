/**
 * Decision calendar derivation test — bundled with esbuild (same pattern
 * as scripts/planner-store.test.mjs / planner-closed-loop.test.mjs; the
 * '@' path alias resolves via esbuild's alias option).
 *
 * Asserts, on the demo seed (buildDemoSeed, anchored to the screenshots'
 * demo date Aug 2, 2026):
 *
 *   1. buildMonthGrid shape: SUN–SAT weeks, 7 cells each, exactly one
 *      `today`, in-month flags correct, leading/trailing days flagged
 *   2. buildWeekDays: 7 SUN–SAT days around an anchor
 *   3. buildAgendaDays: 6 bill days within 21 days of the demo today
 *   4. dayRollup on the demo seed: Aug 2 → bills 112.40, impact −112.40
 *   5. Runway: EOM projected === cashNow − openBillsTotal (formula-level,
 *      16,374.72 on the demo seed's relative dates), series steps down at
 *      due dates, selected-day Proj matches the screenshot (Aug 7)
 *   6. billState transitions: past-due unpaid → overdue, today → due,
 *      +3d → upcoming, +18d autopay → scheduled, paidAt → paid
 *
 * Run: node scripts/planner-calendar.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTDIR = fs.mkdtempSync(path.join(os.tmpdir(), "planner-cal-"));

await build({
  entryPoints: [
    path.join(ROOT, "src/lib/planner/derived.ts"),
    path.join(ROOT, "src/lib/planner/calendar.ts"),
  ],
  outdir: OUTDIR,
  bundle: true,
  format: "esm",
  platform: "neutral",
  logLevel: "silent",
  alias: { "@": path.join(ROOT, "src") },
});

const mod = (name) => import(pathToFileURL(path.join(OUTDIR, name)).href);

const { buildDemoSeed, summarizeAccounts, upcomingBillsTotal } = await mod("derived.js");
const {
  buildMonthGrid,
  buildWeekDays,
  buildAgendaDays,
  dayRollup,
  buildRunwaySeries,
  projectedCashOn,
  billState,
  monthOfISO,
  weekRangeLabel,
} = await mod("calendar.js");

/* The screenshots were taken with demo date Aug 2, 2026. */
const TODAY = "2026-08-02";
const seed = buildDemoSeed(new Date("2026-08-02T12:00:00"));
const { bills, transactions, accounts } = seed;
const cashNow = summarizeAccounts(accounts).cash;
const openTotal = upcomingBillsTotal(bills);

let passed = 0;
function ok(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok ${passed}. ${name}`);
}

/* 1. Month grid shape */
ok("buildMonthGrid: SUN–SAT weeks, 7 cells, one today, in-month flags", () => {
  const weeks = buildMonthGrid(2026, 7, TODAY); // August 2026
  assert.ok(weeks.length >= 4 && weeks.length <= 6, "4–6 weeks");
  for (const week of weeks) assert.equal(week.length, 7);
  const days = weeks.flat();
  // Aug 1 2026 is a Saturday → first week leads with Jul 26.
  assert.equal(days[0].dateISO, "2026-07-26");
  assert.equal(days[0].inMonth, false);
  assert.equal(days[6].dateISO, "2026-08-01");
  assert.equal(days[6].inMonth, true);
  assert.equal(days[6].isWeekend, true);
  const todays = days.filter((d) => d.isToday);
  assert.equal(todays.length, 1);
  assert.equal(todays[0].dateISO, TODAY);
  const inMonth = days.filter((d) => d.inMonth);
  assert.equal(inMonth.length, 31);
  assert.equal(inMonth[0].day, 1);
  assert.equal(inMonth[30].day, 31);
});

/* 2. Week days */
ok("buildWeekDays: SUN–SAT week containing the anchor", () => {
  const week = buildWeekDays("2026-08-05", TODAY);
  assert.equal(week.length, 7);
  assert.equal(week[0].dateISO, "2026-08-02"); // Sunday
  assert.equal(week[6].dateISO, "2026-08-08"); // Saturday
  assert.equal(week[0].isToday, true);
  assert.equal(week[0].isWeekend, true);
  assert.equal(week[3].isWeekend, false);
  assert.equal(weekRangeLabel("2026-08-05"), "Aug 2 – Aug 8");
});

/* 3. Agenda count */
ok("buildAgendaDays: 6 bill days in the next 21 days of the demo seed", () => {
  const days = buildAgendaDays(bills, transactions, TODAY, 21);
  assert.equal(days.length, 6);
  assert.equal(days[0].dateISO, TODAY);
  assert.equal(days[0].offsetDays, 0);
  assert.equal(days[0].billsTotal, 112.4);
  assert.deepEqual(
    days.map((d) => d.offsetDays),
    [0, 3, 5, 8, 12, 18],
  );
});

/* 4. dayRollup on the demo seed */
ok("dayRollup: Aug 2 → bills 112.40, impact −112.40", () => {
  const r = dayRollup(TODAY, bills, transactions);
  assert.equal(r.bills, 112.4);
  assert.equal(r.in, 0);
  assert.equal(r.out, 0);
  assert.equal(r.impact, -112.4);
  assert.equal(r.pressure, 112.4);
  assert.equal(r.billItems.length, 1);
  assert.equal(r.billItems[0].name, "TECO electric");

  const rent = dayRollup("2026-08-05", bills, transactions);
  assert.equal(rent.bills, 1850);
  assert.equal(rent.impact, -1850);
});

/* 5. Runway: EOM formula + step-down + selected-day Proj */
ok("runway: EOM === cashNow − openBillsTotal (16,374.72 on demo seed)", () => {
  const series = buildRunwaySeries(cashNow, bills, transactions, monthOfISO(TODAY));
  // The formula, not the absolute: EOM projected = cash − ALL open bills.
  assert.equal(series.eomProjected, Number((cashNow - openTotal).toFixed(2)));
  // Demo-seed absolute, for the record (screenshot: $16,374.72).
  assert.equal(series.eomProjected, 16374.72);
  assert.equal(series.points.length, 31);
  // Aug 1 starts at full cash; the first step-down lands on Aug 2 (TECO).
  assert.equal(series.points[0].cash, cashNow);
  assert.equal(series.points[1].cash, Number((cashNow - 112.4).toFixed(2)));
  // Flat between bill days (Aug 3–4).
  assert.equal(series.points[2].cash, series.points[1].cash);
  assert.equal(series.points[3].cash, series.points[1].cash);
  // Steps down by rent on Aug 5.
  assert.equal(
    series.points[4].cash,
    Number((cashNow - 112.4 - 1850).toFixed(2)),
  );
  // Last day of month = cashNow − all open bills (all due within August).
  assert.equal(series.points[30].cash, series.eomProjected);
});

ok("projectedCashOn: Aug 7 = cashNow − (112.40 + 1850 + 79.99)", () => {
  // Screenshot cal-ultra-addbill.png: "Proj $16,678.21" for Fri, Aug 7.
  assert.equal(projectedCashOn("2026-08-07", cashNow, bills), 16678.21);
  // Screenshot cal-final-inspector.png: "Proj $16,662.72" for Mon, Aug 10.
  assert.equal(projectedCashOn("2026-08-10", cashNow, bills), 16662.72);
});

/* 6. billState transitions */
ok("billState: overdue / due / upcoming / scheduled / paid", () => {
  const base = {
    id: "b1",
    name: "Test",
    amount: 10,
    category: "utilities",
    frequency: "monthly",
    autopay: false,
    source: "manual",
    paidAt: null,
  };
  assert.equal(
    billState({ ...base, dueDate: "2026-08-01", status: "overdue" }, TODAY),
    "overdue",
  );
  // past-due unpaid → overdue even if the stored status lags
  assert.equal(
    billState({ ...base, dueDate: "2026-08-01", status: "upcoming" }, TODAY),
    "overdue",
  );
  assert.equal(
    billState({ ...base, dueDate: TODAY, status: "due" }, TODAY),
    "due",
  );
  assert.equal(
    billState({ ...base, dueDate: "2026-08-05", status: "upcoming" }, TODAY),
    "upcoming",
  );
  // autopay further than 7d out → scheduled
  assert.equal(
    billState(
      { ...base, dueDate: "2026-08-20", status: "scheduled", autopay: true },
      TODAY,
    ),
    "scheduled",
  );
  assert.equal(
    billState(
      { ...base, dueDate: "2026-08-20", status: "paid", paidAt: "2026-08-02T00:00:00Z" },
      TODAY,
    ),
    "paid",
  );
  // paidAt alone is enough
  assert.equal(
    billState(
      { ...base, dueDate: TODAY, status: "due", paidAt: "2026-08-02T00:00:00Z" },
      TODAY,
    ),
    "paid",
  );
});

console.log(`\nplanner-calendar: ${passed} passed`);
