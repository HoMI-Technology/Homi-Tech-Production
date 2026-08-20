import { describe, it, expect } from "vitest";
import {
  AGENTS,
  routeAgents,
  leadAgentForMode,
  sentinelCheck,
  buildReceipt,
  getAgent,
  isAgentUnlocked,
  type AgentMode,
} from "@/lib/agents/registry";

describe("lib/agents/registry", () => {
  describe("AGENTS", () => {
    it("has exactly seven agents in canonical order", () => {
      expect(AGENTS.map((a) => a.id)).toEqual([
        "homie",
        "scout",
        "analyst",
        "coach",
        "architect",
        "oracle",
        "sentinel",
      ]);
    });

    it("uses only brand-canon colors", () => {
      const brandColors = new Set([
        "#22d3ee",
        "#34d399",
        "#facc15",
        "#fab633",
        "#f24822",
        "#a78bfa",
        "#ef4444",
      ]);
      for (const agent of AGENTS) {
        expect(brandColors.has(agent.color)).toBe(true);
      }
    });

    it("Analyst grounds on Money Stand, not Finance Dashboard", () => {
      const line = getAgent("analyst").systemLine;
      expect(line).toMatch(/Money Stand/);
      expect(line).not.toMatch(/Finance Dashboard/i);
    });
  });

  describe("getAgent", () => {
    it("returns the requested agent", () => {
      expect(getAgent("analyst").name).toBe("Analyst");
      expect(getAgent("sentinel").name).toBe("Sentinel");
    });

    it("falls back to homie for unknown ids", () => {
      expect(getAgent("unknown" as any).id).toBe("homie");
    });
  });

  describe("isAgentUnlocked", () => {
    it("unlocks level-1 agents immediately", () => {
      expect(isAgentUnlocked(getAgent("homie"), 1)).toBe(true);
      expect(isAgentUnlocked(getAgent("sentinel"), 1)).toBe(true);
    });

    it("respects higher unlock levels", () => {
      expect(isAgentUnlocked(getAgent("oracle"), 9)).toBe(false);
      expect(isAgentUnlocked(getAgent("oracle"), 10)).toBe(true);
    });
  });

  describe("routeAgents", () => {
    it("always includes homie", () => {
      expect(routeAgents("hello")).toContain("homie");
    });

    it("routes financial keywords to analyst", () => {
      expect(routeAgents("what is my DTI?")).toContain("analyst");
      expect(routeAgents("can I afford this payment?")).toContain("analyst");
    });

    it("routes emotional keywords to coach", () => {
      expect(routeAgents("I feel uncertain")).toContain("coach");
      expect(routeAgents("everyone else is buying and I have fomo")).toContain("coach");
    });

    it("routes planning keywords to architect", () => {
      expect(routeAgents("what steps should I take?")).toContain("architect");
    });

    it("routes scenario keywords to oracle", () => {
      expect(routeAgents("what if rates go up?")).toContain("oracle");
    });

    it("routes market keywords to scout", () => {
      expect(routeAgents("what are mortgage rates doing?")).toContain("scout");
    });

    it("never routes sentinel as a responder", () => {
      const routed = routeAgents("should I buy this house guaranteed?");
      expect(routed).not.toContain("sentinel");
    });
  });

  describe("leadAgentForMode", () => {
    const cases: [AgentMode, string][] = [
      ["explore", "homie"],
      ["analyze", "analyst"],
      ["plan", "architect"],
      ["simulate", "oracle"],
      ["compare", "scout"],
      ["decompress", "coach"],
    ];

    it.each(cases)("maps %s to %s", (mode, expected) => {
      expect(leadAgentForMode(mode)).toBe(expected);
    });

    it("defaults to homie for null/undefined", () => {
      expect(leadAgentForMode(null)).toBe("homie");
      expect(leadAgentForMode(undefined)).toBe("homie");
    });
  });

  describe("sentinelCheck", () => {
    it("passes safe educational replies", () => {
      const result = sentinelCheck("Your DTI is 32%, which is below the hard-stop line.");
      expect(result.passed).toBe(true);
      expect(result.flagged).toBe(false);
    });

    it("flags disallowed advice patterns", () => {
      const flagged = [
        "You should buy this house.",
        "You are approved for the loan.",
        "This is guaranteed to work out.",
        "I recommend that you sign today.",
      ];
      for (const text of flagged) {
        const result = sentinelCheck(text);
        expect(result.flagged).toBe(true);
        expect(result.passed).toBe(false);
        expect(result.rules_enforced.length).toBeGreaterThan(0);
      }
    });
  });

  describe("buildReceipt", () => {
    it("returns a sha256-labeled receipt with agents, tools, and timestamp", () => {
      const receipt = buildReceipt(["homie", "analyst"], ["dti_snapshot"]);
      expect(receipt.id).toMatch(/^RCPT-/);
      expect(receipt.integrity).toMatch(/^sha256:/);
      expect(receipt.agents).toEqual(["homie", "analyst"]);
      expect(receipt.tools).toEqual(["dti_snapshot"]);
      expect(new Date(receipt.timestamp).getTime()).not.toBeNaN();
    });

    it("produces different ids on successive calls", () => {
      const a = buildReceipt(["homie"], []);
      const b = buildReceipt(["homie"], []);
      expect(a.id).not.toBe(b.id);
    });
  });
});
