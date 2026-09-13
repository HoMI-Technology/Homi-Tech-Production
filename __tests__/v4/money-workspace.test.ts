import { describe, expect, it } from "vitest";
import { V4_SHELL_MONEY_HREF, V4_SHELL_PATH_HREF } from "@/lib/layout/v4-shell";
import { FOLD_CONNECTIONS_HREF } from "@/lib/dashboard/fold-truth";
import { V4_ASK_PLACEHOLDER_FINANCIAL } from "@/lib/v4/assessment-walk";
import {
  MONEY_V4_CRAFT_DISCLAIMER,
  MONEY_V4_EMPTY_BODY,
  MONEY_V4_EMPTY_TITLE,
  MONEY_V4_HARD_STOP_EMPTY_BODY,
  MONEY_V4_HOLD_CLOSE,
  MONEY_V4_HOMI_PROMPTS,
  MONEY_V4_ROOMS,
  V4_ASK_PLACEHOLDER_MONEY,
  V4_MONEY_CONNECT_HREF,
  buildMoneyV4View,
  moneyV4AgeLabel,
  moneyV4ForbidsInventedDollars,
  moneyV4ForbidsOnTrackCopy,
  moneyV4ForbidsReadyCopy,
  moneyV4FormatLiveUsd,
  moneyV4VisualView,
  parseV4MoneyVisualState,
} from "@/lib/v4/money-workspace";

describe("Money v4 workspace law", () => {
  it("locks the workspace to /money, Connect, and the financial Ask", () => {
    expect(V4_SHELL_MONEY_HREF).toBe("/money");
    expect(V4_MONEY_CONNECT_HREF).toBe(FOLD_CONNECTIONS_HREF);
    expect(V4_ASK_PLACEHOLDER_MONEY).toBe("Ask HōMI about this financial picture...");
    expect(V4_ASK_PLACEHOLDER_MONEY).toBe(V4_ASK_PLACEHOLDER_FINANCIAL);
  });

  it("empty state is Connect-only with no invented dollars", () => {
    const view = moneyV4VisualView("empty");
    expect(view.kind).toBe("empty");
    expect(view.accounts).toEqual([]);
    expect(view.liquidCents).toBeNull();
    expect(view.hasLiveRows).toBe(false);
    expect(view.isCraftFixture).toBe(false);
    expect(view.emptyTitle).toBe(MONEY_V4_EMPTY_TITLE);
    expect(view.emptyBody).toBe(MONEY_V4_EMPTY_BODY);
    expect(view.connectHref).toBe("/connections");
    expect(JSON.stringify(view)).not.toMatch(/\$\d/);
    expect(JSON.stringify(view)).not.toContain("4280");
    expect(JSON.stringify(view)).not.toContain("Example Bank");
    expect(view.sourceKind).toBe("empty");
    expect(view.sourceLabel).toMatch(/no live numbers/i);
  });

  it("exposes shipped Money depth rooms including Budget on empty and live", () => {
    const empty = buildMoneyV4View({
      decisionType: "home_buying",
      verdict: null,
      stopCode: null,
      items: [],
      accounts: [],
    });
    expect(empty.rooms.map((room) => room.href)).toEqual(MONEY_V4_ROOMS.map((room) => room.href));
    expect(empty.rooms.map((room) => room.href)).toEqual([
      "/money/budget",
      "/money/plan",
      "/money/decide",
      "/money/bills",
      "/money/goals",
    ]);
    expect(JSON.stringify(empty.rooms)).not.toMatch(/\$\d/);
    const live = buildMoneyV4View({
      decisionType: "home_buying",
      verdict: "ALMOST_THERE",
      stopCode: null,
      items: [
        {
          id: "item-1",
          institution_name: "Live Credit Union",
          status: "healthy",
          last_successful_sync: "2026-09-10T11:00:00.000Z",
        },
      ],
      accounts: [
        {
          id: "a",
          item_id: "item-1",
          name: "Checking",
          type: "depository",
          available_balance: 200,
          current_balance: 180,
          iso_currency: "USD",
        },
      ],
    });
    expect(live.rooms.map((room) => room.href)).toEqual(empty.rooms.map((room) => room.href));
    expect(live.sourceKind).toBe("plaid");
    expect(live.sourceLabel).toMatch(/connected accounts/i);
  });

  it("hard-stop ACTIVE is a hold, empty-or-live, never On track or READY as a badge", () => {
    const view = moneyV4VisualView("hard-stop");
    expect(view.kind).toBe("hard-stop");
    expect(view.hardStopActive).toBe(true);
    expect(view.verdictLabel).toBe("DO NOT PROCEED");
    expect(view.holdLead).toBe("Runway is the hold.");
    expect(view.holdMeta).toMatch(/Hard stop · runway/i);
    expect(view.holdMeta).toMatch(/Under 1 month/);
    expect(view.holdMeta).toContain(MONEY_V4_HOLD_CLOSE);
    expect(view.emptyBody).toBe(MONEY_V4_HARD_STOP_EMPTY_BODY);
    expect(view.liquidCents).toBeNull();
    expect(view.accounts).toEqual([]);
    expect(moneyV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(moneyV4ForbidsReadyCopy(view)).toBe(true);
    expect(view.verdictLabel).not.toMatch(/\bREADY\b/);
    expect(JSON.stringify(view)).not.toMatch(/\$\d/);
  });

  it("connected craft fixture is Preview-only and labeled so Pixel uses live Plaid", () => {
    const view = moneyV4VisualView("connected");
    expect(view.kind).toBe("connected");
    expect(view.isCraftFixture).toBe(true);
    expect(view.hasLiveRows).toBe(true);
    expect(view.liquidCents).toBe(428000);
    expect(moneyV4FormatLiveUsd(view.liquidCents ?? 0)).toBe("$4,280");
    expect(view.ageLabel).toBe("Synced 12 mo ago");
    expect(view.honestyLine).toBe(MONEY_V4_CRAFT_DISCLAIMER);
    expect(view.accounts).toHaveLength(2);
    expect(view.accounts.map((row) => row.name)).toEqual(["Checking", "Savings"]);
  });

  it("production readings never invent the craft fixture dollars", () => {
    const empty = buildMoneyV4View({
      decisionType: "home_buying",
      verdict: null,
      stopCode: null,
      items: [],
      accounts: [],
    });
    expect(empty.liquidCents).toBeNull();
    expect(empty.isCraftFixture).toBe(false);
    expect(moneyV4ForbidsInventedDollars(empty)).toBe(true);
    expect(JSON.stringify(empty)).not.toContain("4280");
    expect(JSON.stringify(empty)).not.toContain("Example Bank");
  });

  it("sums only live depository USD rows and skips null balances", () => {
    const view = buildMoneyV4View({
      decisionType: "home_buying",
      verdict: "ALMOST_THERE",
      stopCode: null,
      items: [
        {
          id: "item-1",
          institution_name: "Live Credit Union",
          status: "healthy",
          last_successful_sync: "2026-09-10T11:00:00.000Z",
        },
      ],
      accounts: [
        {
          id: "a",
          item_id: "item-1",
          name: "Checking",
          type: "depository",
          available_balance: 200,
          current_balance: 180,
          iso_currency: "USD",
        },
        {
          id: "b",
          item_id: "item-1",
          name: "Brokerage",
          type: "investment",
          current_balance: 99999,
          iso_currency: "USD",
        },
        {
          id: "c",
          item_id: "item-1",
          name: "Savings",
          type: "depository",
          available_balance: null,
          current_balance: null,
          iso_currency: "USD",
        },
      ],
      nowMs: Date.parse("2026-09-10T12:00:00.000Z"),
    });
    expect(view.kind).toBe("connected");
    expect(view.isCraftFixture).toBe(false);
    expect(view.liquidCents).toBe(20000);
    expect(view.accounts).toHaveLength(2);
    expect(view.accounts[0]?.cents).toBe(20000);
    expect(view.accounts[1]?.cents).toBeNull();
    expect(view.ageLabel).toBe("Synced 1 hr ago");
  });

  it("stale, syncing, and error stay honest and do not invent $", () => {
    const stale = moneyV4VisualView("stale");
    expect(stale.kind).toBe("stale");
    expect(stale.hasLiveRows).toBe(true);
    expect(stale.honestyLine).toBeTruthy();
    expect(stale.ageLabel.length).toBeGreaterThan(0);

    const syncing = moneyV4VisualView("syncing");
    expect(syncing.kind).toBe("syncing");
    expect(syncing.liquidCents).toBeNull();
    expect(syncing.hasLiveRows).toBe(false);
    expect(JSON.stringify(syncing)).not.toMatch(/\$\d/);

    const error = moneyV4VisualView("error");
    expect(error.kind).toBe("error");
    expect(error.liquidCents).toBeNull();
    expect(error.hasLiveRows).toBe(false);
  });

  it("hard-stop plus live rows keeps the hold and still paints live $", () => {
    const view = buildMoneyV4View({
      decisionType: "home_buying",
      verdict: "NOT_YET",
      stopCode: "RUNWAY_UNDER_1_MONTH",
      lastMoneyMonths: 0.4,
      items: [
        {
          id: "item-1",
          institution_name: "Live Credit Union",
          status: "healthy",
          last_successful_sync: "2026-09-10T12:00:00.000Z",
        },
      ],
      accounts: [
        {
          id: "a",
          item_id: "item-1",
          name: "Checking",
          type: "depository",
          available_balance: 50,
          iso_currency: "USD",
        },
      ],
      nowMs: Date.parse("2026-09-10T12:00:00.000Z"),
    });
    expect(view.hardStopActive).toBe(true);
    expect(view.hasLiveRows).toBe(true);
    expect(view.kind).toBe("hard-stop");
    expect(view.verdictLabel).toBe("DO NOT PROCEED");
    expect(view.liquidCents).toBe(5000);
    expect(moneyV4ForbidsOnTrackCopy(view)).toBe(true);
  });

  it("clarity prompts stay educational and never invent a second score", () => {
    const labels = MONEY_V4_HOMI_PROMPTS.map((item) => item.label);
    expect(labels).toContain("What does liquid cash mean here?");
    expect(labels).toContain("How does Money relate to Path?");
    expect(labels).toContain("Compare without a second score");
    expect(MONEY_V4_HOMI_PROMPTS.some((item) => item.href === V4_SHELL_PATH_HREF)).toBe(true);
    expect(JSON.stringify(MONEY_V4_HOMI_PROMPTS).toLowerCase()).not.toContain("homie");
    expect(JSON.stringify(MONEY_V4_HOMI_PROMPTS)).not.toMatch(/verified/i);
  });

  it("parses Preview-only visual stills and ignores unknown states", () => {
    expect(parseV4MoneyVisualState("empty")).toBe("empty");
    expect(parseV4MoneyVisualState("hard-stop")).toBe("hard-stop");
    expect(parseV4MoneyVisualState("connected")).toBe("connected");
    expect(parseV4MoneyVisualState("pillar-intro")).toBeNull();
    expect(parseV4MoneyVisualState(null)).toBeNull();
  });

  it("always names age, including unknown", () => {
    expect(moneyV4AgeLabel(null)).toBe("Age unknown");
    expect(moneyV4AgeLabel("not-a-date")).toBe("Age unknown");
    expect(
      moneyV4AgeLabel("2026-09-10T12:00:00.000Z", Date.parse("2026-09-10T12:00:30.000Z")),
    ).toBe("Synced just now");
  });
});
