/**
 * Smoke: open /planner and click all five tabs.
 * Usage: node scripts/planner-tab-smoke.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] || "http://127.0.0.1:3000";
const outDir = join(process.cwd(), "tmp", "planner-smoke");
mkdirSync(outDir, { recursive: true });

const TABS = [
  "Overview",
  "Calendar",
  "Banks & bills",
  "Wealth",
  "Plan",
];

const results = [];

// Prefer system Edge — Playwright's bundled Chromium is blocked by WDAC on this host.
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || "msedge",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.setDefaultTimeout(45000);

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

try {
  const url = `${base.replace(/\/$/, "")}/planner`;
  console.log(`Navigating ${url}`);
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  console.log(`HTTP ${resp?.status()}`);

  // Auth redirect?
  const finalUrl = page.url();
  if (finalUrl.includes("sign-in") || finalUrl.includes("auth")) {
    results.push({ tab: "NAV", ok: false, note: `Redirected to auth: ${finalUrl}` });
    await page.screenshot({ path: join(outDir, "00-auth-redirect.png"), fullPage: true });
    throw new Error(`Protected route redirected to ${finalUrl}`);
  }

  // Wait for shell: tab nav or loading spinner to settle
  await page.waitForTimeout(2000);
  // Prefer planner tab nav
  const nav = page.getByRole("navigation", { name: /Planner tabs/i });
  try {
    await nav.waitFor({ state: "visible", timeout: 60000 });
  } catch {
    // Maybe still hydrating
    await page.waitForTimeout(5000);
    await nav.waitFor({ state: "visible", timeout: 30000 });
  }

  await page.screenshot({ path: join(outDir, "01-overview-initial.png"), fullPage: true });
  results.push({
    tab: "Overview",
    ok: true,
    note: "Initial load (default tab)",
    bodySnippet: (await page.locator("body").innerText()).slice(0, 200).replace(/\s+/g, " "),
  });

  for (const label of TABS) {
    if (label === "Overview") {
      // already on overview; re-click to confirm
    }
    const btn = nav.getByRole("button", { name: label, exact: true });
    await btn.click();
    await page.waitForTimeout(800);
    // Active tab should have aria-current=page
    const current = await btn.getAttribute("aria-current");
    const body = (await page.locator("body").innerText()).slice(0, 400).replace(/\s+/g, " ");
    const shot = join(outDir, `tab-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    const ok = current === "page";
    results.push({
      tab: label,
      ok,
      note: ok ? `aria-current=page · shot ${shot}` : `aria-current=${current}`,
      bodySnippet: body.slice(0, 180),
    });
    console.log(`${ok ? "OK" : "FAIL"}  ${label}  aria-current=${current}`);
  }

  // Spot-check hero / score presence on Overview again
  await nav.getByRole("button", { name: "Overview", exact: true }).click();
  await page.waitForTimeout(500);
  const text = await page.locator("body").innerText();
  const hasScore = /\b\d{1,3}(\.\d)?\b/.test(text) && /READY|ALMOST|BUILD|NOT YET|DO NOT PROCEED|Overview/i.test(text);
  results.push({
    tab: "SCORE_CHECK",
    ok: hasScore,
    note: hasScore ? "Score/verdict-ish content present" : "Could not find score/verdict markers",
  });
} catch (e) {
  results.push({ tab: "ERROR", ok: false, note: String(e) });
  try {
    await page.screenshot({ path: join(outDir, "error.png"), fullPage: true });
  } catch {
    /* ignore */
  }
  console.error(e);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log("\n=== PLANNER TAB SMOKE ===");
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.tab} — ${r.note}`);
}
if (consoleErrors.length) {
  console.log("\nConsole errors (first 10):");
  for (const e of consoleErrors.slice(0, 10)) console.log(" ·", e.slice(0, 200));
}
console.log(`\nScreenshots: ${outDir}`);
console.log(`SMOKE_EXIT=${failed.length ? 1 : 0}`);
process.exit(failed.length ? 1 : 0);
