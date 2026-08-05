/**
 * Finance insight domain type — shared by the insights API and any UI that
 * surfaces agent-authored money signals. Lives in lib/ (not a deleted panel).
 */

import type { AgentId } from "@/lib/agents/registry";

export interface FinanceInsight {
  id: string;
  agentId: AgentId;
  type: "signal" | "nudge" | "goal-suggestion" | "step";
  title: string;
  body: string;
  severity?: "emerald" | "yellow" | "amber" | "crimson";
  action?: { label: string; href: string };
}
