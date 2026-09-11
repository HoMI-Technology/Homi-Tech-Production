import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_SIMULATION_INPUTS, simulateScenario } from "@/lib/decisions/simulate";
import { V4_SHELL_COMPARE_HREF, V4_SHELL_PATH_HREF } from "@/lib/layout/v4-shell";
import { V4_ASK_PLACEHOLDER_COMPARE } from "@/lib/v4/assessment-walk";
import {
  COMPARE_V4_CARD_BADGE,
  COMPARE_V4_EMPTY_BODY,
  COMPARE_V4_EMPTY_TITLE,
  COMPARE_V4_ENGINE_DISCLAIMER,
  COMPARE_V4_ENGINE_LABELS,
  COMPARE_V4_HARD_STOP_EMPTY_BODY,
  COMPARE_V4_HOLD_CLOSE,
  COMPARE_V4_HOMI_PROMPTS,
  COMPARE_V4_MAX_CARDS,
  COMPARE_V4_START_LABEL,
  V4_ASK_PLACEHOLDER_COMPARE_FIELD,
  V4_COMPARE_HREF,
  buildCompareV4View,
  compareV4AgeLabel,
  compareV4ApprovedCatalog,
  compareV4ForbidsInventedDollars,
  compareV4ForbidsOnTrackCopy,
  compareV4ForbidsReadyCopy,
  compareV4ForbidsSecondScore,
  compareV4VisualView,
  parseV4CompareVisualState,
} from "@/lib/v4/compare-workspace";

describe("Compare v4 workspace law", () => {
  it("locks the workspace to /scenarios, Path Open, and the comparison Ask", () => {
    expect(V4_SHELL_COMPARE_HREF).toBe("/scenarios");
    expect(V4_COMPARE_HREF).toBe("/scenarios");
    expect(V4_ASK_PLACEHOLDER_COMPARE_FIELD).toBe("Ask HōMI about this comparison...");
    expect(V4_ASK_PLACEHOLDER_COMPARE_FIELD).toBe(V4_ASK_PLACEHOLDER_COMPARE);
    expect(COMPARE_V4_MAX_CARDS).toBe(4);
    expect(COMPARE_V4_ENGINE_DISCLAIMER).toMatch(/Educational/i);
  });

  it("reuses engine scenario labels without quoting default simulation dollars", () => {
    expect(COMPARE_V4_ENGINE_LABELS["wait-12"]).toBe(
      simulateScenario("wait-12", DEFAULT_SIMULATION_INPUTS).label,
    );
    expect(COMPARE_V4_ENGINE_LABELS["buy-now"]).toBe(
      simulateScenario("buy-now", DEFAULT_SIMULATION_INPUTS).label,
    );
    expect(COMPARE_V4_ENGINE_LABELS["wait-24"]).toBe(
      simulateScenario("wait-24", DEFAULT_SIMULATION_INPUTS).label,
    );
    const catalog = compareV4ApprovedCatalog();
    expect(catalog.length).toBeLessThanOrEqual(COMPARE_V4_MAX_CARDS);
    expect(catalog.every((card) => card.liveAmountLabel == null)).toBe(true);
    expect(JSON.stringify(catalog)).not.toMatch(/\$\d/);
  });

  it("empty state is Start-only with no invented results or a second score", () => {
    const view = compareV4VisualView("empty");
    expect(view.kind).toBe("empty");
    expect(view.cards).toEqual([]);
    expect(view.hasLiveCards).toBe(false);
    expect(view.isCraftFixture).toBe(false);
    expect(view.emptyTitle).toBe(COMPARE_V4_EMPTY_TITLE);
    expect(view.emptyBody).toBe(COMPARE_V4_EMPTY_BODY);
    expect(view.startLabel).toBe(COMPARE_V4_START_LABEL);
    expect(view.ageLabel).toBeNull();
    expect(JSON.stringify(view.cards)).not.toMatch(/\$\d/);
    expect(JSON.stringify({ ...view, catalog: [] })).not.toContain("Example craft");
    expect(compareV4ForbidsInventedDollars(view)).toBe(true);
    expect(compareV4ForbidsSecondScore(view)).toBe(true);
  });

  it("hard-stop ACTIVE is educational-only, never On track or READY as a badge", () => {
    const view = compareV4VisualView("hard-stop");
    expect(view.kind).toBe("hard-stop");
    expect(view.hardStopActive).toBe(true);
    expect(view.verdictLabel).toBe("DO NOT PROCEED");
    expect(view.holdLead).toBe("Runway is the hold.");
    expect(view.holdMeta).toMatch(/Hard stop · runway/i);
    expect(view.holdMeta).toContain(COMPARE_V4_HOLD_CLOSE);
    expect(view.emptyBody).toBe(COMPARE_V4_HARD_STOP_EMPTY_BODY);
    expect(view.cards).toEqual([]);
    expect(compareV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(compareV4ForbidsReadyCopy(view)).toBe(true);
    expect(view.verdictLabel).not.toMatch(/\bREADY\b/);
    expect(view.verdictLabel).not.toMatch(/\bOn track\b/);
    expect(view.listTitle).not.toMatch(/\bOn track\b/);
    expect(JSON.stringify(view.cards)).not.toMatch(/\bOn track\b/);
    expect(JSON.stringify(view.cards)).not.toMatch(/\$\d/);
  });

  it("normal approved cards stay educational, quiet-age, and dollar-free", () => {
    const view = compareV4VisualView("normal");
    expect(view.kind).toBe("normal");
    expect(view.hasLiveCards).toBe(true);
    expect(view.cards.length).toBeGreaterThan(0);
    expect(view.cards.length).toBeLessThanOrEqual(COMPARE_V4_MAX_CARDS);
    expect(view.cards.length).toBeLessThanOrEqual(4);
    expect(view.ageLabel).toBe("Last run Aug 29");
    expect(view.eduBadge).toBe("Educational");
    expect(view.cards.every((card) => card.badge === COMPARE_V4_CARD_BADGE)).toBe(true);
    expect(view.cards.every((card) => card.href === V4_SHELL_PATH_HREF)).toBe(true);
    expect(view.cards[0]?.ctaEmphasis).toBe("primary");
    expect(view.cards.every((card) => card.liveAmountLabel == null)).toBe(true);
    expect(view.honestyLine).toBeNull();
    expect(JSON.stringify(view)).not.toMatch(/\$\d/);
    expect(JSON.stringify(view)).not.toContain("Example craft");
    expect(JSON.stringify(view)).not.toContain("Pixel");
  });

  it("production readings never invent default simulation dollars", () => {
    const empty = buildCompareV4View({
      decisionType: "home_buying",
      verdict: null,
      stopCode: null,
      saved: [],
    });
    expect(empty.hasLiveCards).toBe(false);
    expect(empty.isCraftFixture).toBe(false);
    expect(JSON.stringify(empty.cards)).not.toContain("400000");
    expect(JSON.stringify(empty.cards)).not.toMatch(/\$\d/);
  });

  it("caps live saved cards at four and never paints inputs as $", () => {
    const view = buildCompareV4View({
      decisionType: "home_buying",
      verdict: "ALMOST_THERE",
      stopCode: null,
      saved: [
        { id: "1", name: "Wait six months", savedAt: "2026-08-29T12:00:00.000Z" },
        { id: "2", name: "Buy sooner", savedAt: "2026-08-29T12:00:00.000Z" },
        { id: "3", name: "Wait longer", savedAt: "2026-08-29T12:00:00.000Z" },
        { id: "4", name: "Hold the line", savedAt: "2026-08-29T12:00:00.000Z" },
        { id: "5", name: "Should not render", savedAt: "2026-08-29T12:00:00.000Z" },
      ],
      nowMs: Date.parse("2026-09-11T12:00:00.000Z"),
    });
    expect(view.kind).toBe("normal");
    expect(view.cards).toHaveLength(4);
    expect(view.cards.map((card) => card.title)).not.toContain("Should not render");
    expect(view.cards.every((card) => card.liveAmountLabel == null)).toBe(true);
    expect(JSON.stringify(view.cards)).not.toMatch(/\$\d/);
  });

  it("stale and error stay honest and do not invent $", () => {
    const stale = compareV4VisualView("stale");
    expect(stale.kind).toBe("stale");
    expect(stale.hasLiveCards).toBe(true);
    expect(stale.honestyLine).toBeTruthy();
    expect(stale.ageLabel).toMatch(/Last run/);
    expect(JSON.stringify(stale)).not.toMatch(/\$\d/);

    const error = compareV4VisualView("error");
    expect(error.kind).toBe("error");
    expect(error.hasLiveCards).toBe(false);
    expect(error.cards).toEqual([]);
    expect(JSON.stringify(error.cards)).not.toMatch(/\$\d/);
  });

  it("hard-stop plus live cards keeps the hold and stays educational", () => {
    const view = buildCompareV4View({
      decisionType: "home_buying",
      verdict: "NOT_YET",
      stopCode: "RUNWAY_UNDER_1_MONTH",
      lastMoneyMonths: 0.4,
      saved: [{ id: "1", name: "Wait 12 months", key: "wait-12", savedAt: "2026-08-29T12:00:00.000Z" }],
      nowMs: Date.parse("2026-09-11T12:00:00.000Z"),
    });
    expect(view.hardStopActive).toBe(true);
    expect(view.hasLiveCards).toBe(true);
    expect(view.kind).toBe("hard-stop");
    expect(view.verdictLabel).toBe("DO NOT PROCEED");
    expect(compareV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(view.verdictLabel).not.toMatch(/\bOn track\b/);
    expect(JSON.stringify(view.cards)).not.toMatch(/\bOn track\b/);
  });

  it("clarity prompts stay educational and never invent a second score", () => {
    const labels = COMPARE_V4_HOMI_PROMPTS.map((item) => item.label);
    expect(labels).toContain("What is educational compare?");
    expect(labels).toContain("Why isn't this a second score?");
    expect(labels).toContain("Compare without a second score");
    expect(JSON.stringify(COMPARE_V4_HOMI_PROMPTS).toLowerCase()).not.toContain("homie");
    expect(JSON.stringify(COMPARE_V4_HOMI_PROMPTS)).not.toMatch(/verified/i);
  });

  it("parses Preview-only visual stills and ignores unknown states", () => {
    expect(parseV4CompareVisualState("empty")).toBe("empty");
    expect(parseV4CompareVisualState("hard-stop")).toBe("hard-stop");
    expect(parseV4CompareVisualState("normal")).toBe("normal");
    expect(parseV4CompareVisualState("pillar-intro")).toBeNull();
    expect(parseV4CompareVisualState(null)).toBeNull();
  });

  it("quiet age never invents a verbose fixture line", () => {
    expect(compareV4AgeLabel(null)).toBeNull();
    expect(compareV4AgeLabel("not-a-date")).toBe("Age unknown");
    expect(compareV4AgeLabel("2026-08-29T12:00:00.000Z")).toBe("Last run Aug 29");
    const page = readFileSync(resolve(process.cwd(), "app/(product)/scenarios/page.tsx"), "utf8");
    expect(page).toContain("assertAssessmentResultOnly");
    expect(page).toContain("CompareWorkspaceV4");
    expect(page).not.toContain("lib/scoring");
    expect(page).not.toContain("PageFrame");
    expect(page).not.toContain("NetPositionChart");
    expect(page).not.toContain("DEFAULT_SIMULATION_INPUTS");
    expect(page).not.toMatch(/\.insert\(|\.upsert\(|\.update\(/);
  });
});
