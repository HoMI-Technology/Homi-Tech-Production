import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  V4_SHELL_ASSESS_HREF,
  V4_SHELL_ASK_HREF,
  V4_SHELL_COMPARE_HREF,
  V4_SHELL_HOME_HREF,
  V4_SHELL_MONEY_HREF,
  V4_SHELL_PATH_HREF,
} from "@/lib/layout/v4-shell";
import { V4_ASK_PLACEHOLDER_READINESS } from "@/lib/v4/assessment-walk";
import {
  ASK_V4_CARDS_MAX,
  ASK_V4_EMPTY_BODY,
  ASK_V4_EMPTY_TITLE,
  ASK_V4_HARD_STOP_BODY,
  ASK_V4_HARD_STOP_TITLE,
  ASK_V4_HOLD_CLOSE,
  ASK_V4_PROMPTS,
  ASK_V4_PROMPTS_MAX,
  V4_ASK_DEEP_LINKS,
  V4_ASK_HREF,
  V4_ASK_PLACEHOLDER_FIELD,
  askV4AgeLabel,
  askV4DefaultTitle,
  askV4ForbidsInventedDollars,
  askV4ForbidsOnTrackCopy,
  askV4ForbidsReadyCopy,
  askV4ForbidsSecondScore,
  askV4PromptsFor,
  askV4VisualView,
  buildAskV4View,
  parseV4AskVisualState,
  v4AskDeepLinkAllowed,
} from "@/lib/v4/contextual-homi";

describe("Contextual HōMI v4 law", () => {
  it("locks /ask as a deep entry, not a peer dashboard", () => {
    expect(V4_SHELL_ASK_HREF).toBe("/ask");
    expect(V4_ASK_HREF).toBe("/ask");
    expect(V4_ASK_PLACEHOLDER_FIELD).toBe("Ask HōMI about this readiness...");
    expect(V4_ASK_PLACEHOLDER_FIELD).toBe(V4_ASK_PLACEHOLDER_READINESS);
    expect(V4_ASK_DEEP_LINKS).toEqual([
      V4_SHELL_HOME_HREF,
      V4_SHELL_MONEY_HREF,
      V4_SHELL_PATH_HREF,
      V4_SHELL_COMPARE_HREF,
      V4_SHELL_ASSESS_HREF,
    ]);
  });

  it("caps prompts and only deep-links Home/Money/Path/Compare/Assess", () => {
    for (const kind of ["empty", "hard-stop", "default"] as const) {
      const prompts = askV4PromptsFor(kind);
      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts.length).toBeLessThanOrEqual(ASK_V4_PROMPTS_MAX);
      expect(prompts.every((item) => v4AskDeepLinkAllowed(item.href))).toBe(true);
      expect(JSON.stringify(prompts)).not.toContain("/learn");
      expect(JSON.stringify(prompts)).not.toContain("/results");
      expect(JSON.stringify(prompts).toLowerCase()).not.toContain("homie");
    }
    expect(ASK_V4_PROMPTS.default.some((item) => /second score/i.test(item.label))).toBe(true);
    expect(v4AskDeepLinkAllowed("/advisor")).toBe(false);
    expect(v4AskDeepLinkAllowed("/learn")).toBe(false);
  });

  it("empty state is Assess-only with no fake readiness or $", () => {
    const view = askV4VisualView("empty");
    expect(view.kind).toBe("empty");
    expect(view.cards).toEqual([]);
    expect(view.hasAssessment).toBe(false);
    expect(view.title).toBe(ASK_V4_EMPTY_TITLE);
    expect(view.body).toBe(ASK_V4_EMPTY_BODY);
    expect(view.cta?.href).toBe(V4_SHELL_ASSESS_HREF);
    expect(view.ageLabel).toBeNull();
    expect(JSON.stringify(view)).not.toMatch(/\$\d/);
    expect(JSON.stringify(view)).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(askV4ForbidsInventedDollars(view)).toBe(true);
    expect(askV4ForbidsSecondScore(view)).toBe(true);
  });

  it("hard-stop ACTIVE stays explain-only and never paints On track or READY", () => {
    const view = askV4VisualView("hard-stop");
    expect(view.kind).toBe("hard-stop");
    expect(view.hardStopActive).toBe(true);
    expect(view.verdictLabel).toBe("DO NOT PROCEED");
    expect(view.holdLead).toBe("Runway is the hold.");
    expect(view.holdMeta).toContain(ASK_V4_HOLD_CLOSE);
    expect(view.title).toBe(ASK_V4_HARD_STOP_TITLE);
    expect(view.body).toBe(ASK_V4_HARD_STOP_BODY);
    expect(view.cta?.href).toBe(V4_SHELL_PATH_HREF);
    expect(view.cards).toEqual([]);
    expect(askV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(askV4ForbidsReadyCopy(view)).toBe(true);
    expect(view.verdictLabel).not.toMatch(/\bREADY\b/);
    expect(view.verdictLabel).not.toMatch(/\bOn track\b/);
    expect(view.title).not.toMatch(/\bOn track\b/);
    expect(JSON.stringify(view)).not.toMatch(/\$\d/);
    expect(JSON.stringify(view)).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
  });

  it("default explains the last read without a second score or invented $", () => {
    const view = askV4VisualView("default");
    expect(view.kind).toBe("default");
    expect(view.hasAssessment).toBe(true);
    expect(view.title).toBe("Path still leads.");
    expect(view.title).not.toMatch(/you're ready/i);
    expect(view.title).not.toMatch(/you're close/i);
    expect(JSON.stringify(view)).not.toMatch(/Tighten runway before offers/);
    expect(askV4ForbidsReadyCopy(view)).toBe(true);
    expect(view.ageLabel).toBe("Assessed Aug 29");
    expect(view.verdictLabel).toBeNull();
    expect(view.cards.length).toBeGreaterThan(0);
    expect(view.cards.length).toBeLessThanOrEqual(ASK_V4_CARDS_MAX);
    expect(view.cards.every((card) => v4AskDeepLinkAllowed(card.href))).toBe(true);
    expect(view.cards.every((card) => card.badge === "Educational")).toBe(true);
    expect(JSON.stringify(view)).not.toMatch(/\$\d/);
    expect(JSON.stringify(view)).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(JSON.stringify(view)).not.toContain("Example craft");
    expect(JSON.stringify(view)).not.toContain("CRAFT V4");
    expect(askV4ForbidsSecondScore(view)).toBe(true);
  });

  it("production readings never mint a score or $", () => {
    const empty = buildAskV4View(null);
    expect(empty.kind).toBe("empty");
    expect(empty.cards).toEqual([]);
    const ready = buildAskV4View({
      decisionType: "home_buying",
      verdict: "READY",
      stopCode: null,
      scoredAt: "2026-08-29T12:00:00.000Z",
    });
    expect(ready.kind).toBe("default");
    expect(ready.verdictLabel).toBeNull();
    expect(ready.title).toBe("Path still leads.");
    expect(ready.title).toBe(askV4DefaultTitle("READY"));
    expect(ready.title).not.toMatch(/you're ready/i);
    expect(JSON.stringify(ready)).not.toMatch(/Tighten runway before offers/);
    expect(askV4ForbidsReadyCopy(ready)).toBe(true);
    expect(JSON.stringify(ready)).not.toMatch(/\$\d/);
  });

  it("parses Preview-only visual stills and ignores unknown states", () => {
    expect(parseV4AskVisualState("empty")).toBe("empty");
    expect(parseV4AskVisualState("hard-stop")).toBe("hard-stop");
    expect(parseV4AskVisualState("default")).toBe("default");
    expect(parseV4AskVisualState("normal")).toBeNull();
    expect(parseV4AskVisualState(null)).toBeNull();
  });

  it("quiet age never invents a verbose fixture line", () => {
    expect(askV4AgeLabel(null)).toBeNull();
    expect(askV4AgeLabel("not-a-date")).toBe("Age unknown");
    expect(askV4AgeLabel("2026-08-29T12:00:00.000Z")).toBe("Assessed Aug 29");
    const page = readFileSync(resolve(process.cwd(), "app/(product)/ask/page.tsx"), "utf8");
    expect(page).toContain("assertAssessmentResultOnly");
    expect(page).toContain("ContextualHomiV4");
    expect(page).not.toContain("lib/scoring");
    expect(page).not.toContain("PageFrame");
    expect(page).not.toMatch(/\.insert\(|\.upsert\(|\.update\(/);
  });
});
