import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hubLenses } from "@/lib/tools/registry";
import {
  V4_ASK_PLACEHOLDER_ACCOUNTS,
  V4_ASK_PLACEHOLDER_BILLS,
  V4_ASK_PLACEHOLDER_LEARN,
  V4_ASK_PLACEHOLDER_SETTINGS,
  V4_ASK_PLACEHOLDER_TOOLS,
} from "@/lib/v4/assessment-walk";
import {
  ACCOUNTS_V4_LIVE_TITLE,
  accountsV4ForbidsInventedDollars,
  accountsV4MaskLabel,
  accountsV4VisualView,
  buildAccountsV4View,
} from "@/lib/v4/accounts-workspace";
import {
  BILLS_V4_EMPTY_TITLE,
  BILLS_V4_HOLD_LEAD,
  BILLS_V4_OPEN_MONEY,
  billsV4ForbidsInventedDollars,
  billsV4ForbidsOnTrackCopy,
  billsV4ForbidsReadyCopy,
  billsV4VisualView,
  buildBillsV4View,
} from "@/lib/v4/bills-workspace";
import {
  LEARN_V4_EMPTY_TITLE,
  LEARN_V4_LIVE_GUIDES,
  learnV4ForbidsInventedDollars,
  learnV4VisualView,
} from "@/lib/v4/learn-workspace";
import {
  SETTINGS_V4_ENTRIES,
  settingsV4ForbidsInventedDollars,
  settingsV4QuarantinesExtras,
  settingsV4VisualView,
} from "@/lib/v4/settings-workspace";
import {
  SYSTEM_V4_BLOCKS_MAX,
  SYSTEM_V4_HOLD_META_LINE,
  SYSTEM_V4_LIVE_SSOT,
  SYSTEM_V4_PROMPTS_MAX,
  V4_ASK_PLACEHOLDER_BY_SURFACE,
  systemV4AgeLabel,
  SYSTEM_V4_FIXTURE_NOW_MS,
  SYSTEM_V4_FIXTURE_SYNCED_12M,
} from "@/lib/v4/system-surfaces";
import {
  TOOLS_V4_EMPTY_TITLE,
  toolsV4ForbidsInventedDollars,
  toolsV4ForbidsOnTrackCopy,
  toolsV4ForbidsSecondScore,
  toolsV4VisualView,
} from "@/lib/v4/tools-workspace";

function blob(view: unknown): string {
  return JSON.stringify(view);
}

describe("System surfaces v4 law", () => {
  it("locks workspace-bound Ask placeholders from the craft table", () => {
    expect(V4_ASK_PLACEHOLDER_BY_SURFACE.bills).toBe("Ask HōMI about these bills...");
    expect(V4_ASK_PLACEHOLDER_BY_SURFACE.tools).toBe("Ask HōMI about these tools...");
    expect(V4_ASK_PLACEHOLDER_BY_SURFACE.learn).toBe("Ask HōMI about this learning...");
    expect(V4_ASK_PLACEHOLDER_BY_SURFACE.accounts).toBe("Ask HōMI about these accounts...");
    expect(V4_ASK_PLACEHOLDER_BY_SURFACE.settings).toBe("Ask HōMI about these settings...");
    expect(V4_ASK_PLACEHOLDER_BILLS).toBe(V4_ASK_PLACEHOLDER_BY_SURFACE.bills);
    expect(V4_ASK_PLACEHOLDER_TOOLS).toBe(V4_ASK_PLACEHOLDER_BY_SURFACE.tools);
    expect(V4_ASK_PLACEHOLDER_LEARN).toBe(V4_ASK_PLACEHOLDER_BY_SURFACE.learn);
    expect(V4_ASK_PLACEHOLDER_ACCOUNTS).toBe(V4_ASK_PLACEHOLDER_BY_SURFACE.accounts);
    expect(V4_ASK_PLACEHOLDER_SETTINGS).toBe(V4_ASK_PLACEHOLDER_BY_SURFACE.settings);
  });

  it("quiet age spells minutes out so 12m means months", () => {
    expect(systemV4AgeLabel(SYSTEM_V4_FIXTURE_SYNCED_12M, SYSTEM_V4_FIXTURE_NOW_MS)).toBe(
      "Synced 12m ago",
    );
    expect(
      systemV4AgeLabel("2026-09-11T11:48:00.000Z", SYSTEM_V4_FIXTURE_NOW_MS),
    ).toBe("Synced 12 min ago");
  });

  it("Bills empty is Open Money with no invented dues", () => {
    const view = billsV4VisualView("empty");
    expect(view.kind).toBe("empty");
    expect(view.hasLiveRows).toBe(false);
    expect(view.title).toBe(BILLS_V4_EMPTY_TITLE);
    expect(view.cta).toEqual({ label: BILLS_V4_OPEN_MONEY, href: "/money" });
    expect(view.prompts).toHaveLength(SYSTEM_V4_PROMPTS_MAX);
    expect(view.askPlaceholder).toBe(V4_ASK_PLACEHOLDER_BILLS);
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(billsV4ForbidsInventedDollars(view)).toBe(true);
    expect(buildBillsV4View(null).hasLiveRows).toBe(false);
  });

  it("Bills hard-stop is explain-only and never On track or READY", () => {
    const view = billsV4VisualView("hard-stop");
    expect(view.kind).toBe("hard-stop");
    expect(view.hardStopActive).toBe(true);
    expect(view.verdictLabel).toBe("DO NOT PROCEED");
    expect(view.holdLead).toBe(BILLS_V4_HOLD_LEAD);
    expect(view.holdMeta).toBe(SYSTEM_V4_HOLD_META_LINE);
    expect(view.cta.href).toBe("/path");
    expect(billsV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(billsV4ForbidsReadyCopy(view)).toBe(true);
    expect(blob(view)).toMatch(/never On track/i);
    expect(blob(view)).not.toMatch(/\bREADY\b/);
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view).toLowerCase()).not.toContain("homie");
  });

  it("Tools reuses ten hub lenses and never invents a score tile", () => {
    expect(hubLenses()).toHaveLength(10);
    const empty = toolsV4VisualView("empty");
    const catalog = toolsV4VisualView("catalog");
    expect(empty.kind).toBe("empty");
    expect(empty.title).toBe(TOOLS_V4_EMPTY_TITLE);
    expect(empty.lenses).toHaveLength(10);
    expect(catalog.lenses.map((lens) => lens.id)).toEqual(hubLenses().map((lens) => lens.id));
    expect(toolsV4ForbidsSecondScore(empty)).toBe(true);
    expect(toolsV4ForbidsInventedDollars(empty)).toBe(true);
    expect(blob(empty)).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(blob(catalog)).not.toMatch(/\$\d/);
    const hold = toolsV4VisualView("hard-stop");
    expect(toolsV4ForbidsOnTrackCopy(hold)).toBe(true);
    expect(hold.cta?.href).toBe("/path");
    expect(blob(hold)).toMatch(/never On track/i);
  });

  it("Learn empty or live catalog uses real /guides slugs, never invented SKUs", () => {
    const empty = learnV4VisualView("empty");
    const live = learnV4VisualView("live");
    expect(empty.title).toBe(LEARN_V4_EMPTY_TITLE);
    expect(empty.guides).toEqual([]);
    expect(empty.cta.href).toBe("/guides");
    expect(live.guides).toHaveLength(3);
    expect(live.guides.map((guide) => guide.slug)).toEqual(LEARN_V4_LIVE_GUIDES.map((g) => g.slug));
    expect(live.guides.every((guide) => guide.href.startsWith("/guides/"))).toBe(true);
    expect(blob(live)).not.toContain("SKU");
    expect(learnV4ForbidsInventedDollars(empty)).toBe(true);
    expect(blob(empty)).not.toMatch(/\$\d/);
  });

  it("Accounts live rows are name + mask + Live SSOT with no balances", () => {
    const view = accountsV4VisualView("normal");
    expect(view.kind).toBe("normal");
    expect(view.title).toBe(ACCOUNTS_V4_LIVE_TITLE);
    expect(view.ageLabel).toBe("Synced 12m ago");
    expect(view.rows).toHaveLength(2);
    expect(view.rows.map((row) => row.name)).toEqual(["Checking", "Savings"]);
    expect(view.rows.map((row) => accountsV4MaskLabel(row.mask))).toEqual(["*4821", "*0199"]);
    expect(view.rows.every((row) => row.liveLabel === SYSTEM_V4_LIVE_SSOT)).toBe(true);
    expect(view.rows.some((row) => "cents" in row || "balance" in row)).toBe(false);
    expect(blob(view)).not.toMatch(/current_balance|available_balance|cents/);
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(accountsV4ForbidsInventedDollars(view)).toBe(true);
    expect(view.canManage).toBe(false);
    const production = buildAccountsV4View({
      decisionType: "home_buying",
      verdict: null,
      stopCode: null,
      items: [],
      accounts: [],
    });
    expect(production.rows).toEqual([]);
    expect(accountsV4ForbidsInventedDollars(production)).toBe(true);
    expect(blob(production)).not.toContain("4821");
  });

  it("Settings is Account · Privacy · Billing only", () => {
    const view = settingsV4VisualView("empty");
    expect(view.entries).toHaveLength(3);
    expect(view.entries.map((entry) => entry.id)).toEqual(["account", "privacy", "billing"]);
    expect(SETTINGS_V4_ENTRIES).toHaveLength(3);
    expect(settingsV4QuarantinesExtras(view)).toBe(true);
    expect(view.entries.some((entry) => /notif/i.test(entry.title))).toBe(false);
    expect(view.entries.find((entry) => entry.id === "billing")?.href).toBe("/settings/subscription");
    expect(view.entries.find((entry) => entry.id === "privacy")?.href).toBe("/legal/privacy");
    expect(settingsV4ForbidsInventedDollars(view)).toBe(true);
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(view.prompts.length).toBeLessThanOrEqual(SYSTEM_V4_PROMPTS_MAX);
    expect(SYSTEM_V4_BLOCKS_MAX).toBe(3);
  });

  it("connections page never selects Plaid balances onto the Accounts view", () => {
    const page = readFileSync(resolve(process.cwd(), "app/(product)/connections/page.tsx"), "utf8");
    expect(page).toContain('select("id, item_id, name, mask, type, subtype")');
    expect(page).not.toMatch(/current_balance|available_balance/);
    expect(page).not.toMatch(/HOMI_V4_SYSTEM/);
  });
});
