import { describe, expect, it } from "vitest";
import {
  ARCHITECTURE_CALCULATORS,
  ARCHITECTURE_GAPS,
  TOOL_ALIASES,
  CANONICAL_TOOL_ROUTES,
  ADVISOR_TOOL_HANDOFF_PATHS,
  advisorToolHandoffLine,
  buildAgents,
  buildArchitectureDocument,
  buildScoringEngine,
} from "@/lib/architecture";

describe("architecture feed canon", () => {
  it("keeps oracle/analyst unlock levels from the registry", () => {
    const agents = buildAgents();
    expect(agents.find((a) => a.id === "oracle")?.level).toBe(10);
    expect(agents.find((a) => a.id === "analyst")?.level).toBe(3);
    expect(agents.find((a) => a.id === "coach")?.level).toBe(5);
    expect(agents.find((a) => a.id === "architect")?.level).toBe(8);
  });

  it("never ships poisoned calculator slugs", () => {
    for (const calc of ARCHITECTURE_CALCULATORS) {
      expect(calc.route).not.toMatch(/mortgage-payment|home-equity|apr-comparison/);
    }
    expect(CANONICAL_TOOL_ROUTES).toContain("/tools/mortgage");
    expect(CANONICAL_TOOL_ROUTES).toContain("/tools/heloc");
    expect(CANONICAL_TOOL_ROUTES).toContain("/tools/apr-compare");
  });

  it("maps legacy aliases to canonical routes", () => {
    expect(TOOL_ALIASES["/tools/mortgage-payment"]).toBe("/tools/mortgage");
    expect(TOOL_ALIASES["/tools/home-equity"]).toBe("/tools/heloc");
    expect(TOOL_ALIASES["/tools/apr-comparison"]).toBe("/tools/apr-compare");
  });

  it("keeps dual-stable verdict vocabulary", () => {
    const scoring = buildScoringEngine();
    expect(scoring.verdict_thresholds.NOT_YET.key).toBe("NOT_YET");
    expect(scoring.verdict_thresholds.NOT_YET.label).toBe("DO NOT PROCEED");
    expect(JSON.stringify(scoring)).not.toMatch(/#fb923c|#ef4444/i);
  });

  it("only lists verified residual gaps", () => {
    expect(ARCHITECTURE_GAPS.every((g) => g.verified)).toBe(true);
    expect(ARCHITECTURE_GAPS.some((g) => /keyboard shortcuts/i.test(g.issue))).toBe(false);
  });

  it("advisor hand-off line includes every canonical tool route", () => {
    const line = advisorToolHandoffLine();
    for (const route of CANONICAL_TOOL_ROUTES) {
      expect(line).toContain(route);
    }
    for (const route of ADVISOR_TOOL_HANDOFF_PATHS) {
      if (route.startsWith("/tools/") && route !== "/tools") {
        expect(CANONICAL_TOOL_ROUTES as readonly string[]).toContain(route);
      }
    }
  });

  it("buildArchitectureDocument derives stats from arrays", () => {
    const doc = buildArchitectureDocument({
      productRoutes: [
        { path: "/", file: "app/[locale]/(marketing)/page.tsx" },
        { path: "/tools/mortgage", file: "app/[locale]/(product)/tools/mortgage/page.tsx" },
      ],
      apiRouteDirs: ["advisor", "scoring"],
      componentDirs: [{ name: "agents", count: 2, examples: ["AgentHubPanel"] }],
      libModules: [{ name: "architecture", purpose: "Agent feed" }],
      migrationCount: 32,
      generated: "2026-07-22",
      siteUrl: "https://homitechnology.com",
    });
    expect(doc.stats.product_routes).toBe(2);
    expect(doc.stats.api_routes).toBe(2);
    expect(doc._meta.feed_url).toBe("https://homitechnology.com/architecture.json");
    expect(doc.tool_aliases["/tools/mortgage-payment"]).toBe("/tools/mortgage");
    expect(doc.ai_agents.find((a) => a.id === "oracle")?.level).toBe(10);
  });
});
