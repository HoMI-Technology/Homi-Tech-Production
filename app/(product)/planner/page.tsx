"use client";

/**
 * Closed-loop Budget Planner — five-tab surface ported from the Kimi SPA build.
 * Scoring: production `@/lib/scoring` only (via `@/lib/score` adapter).
 * Path: production `@/lib/readiness/path` (via `@/lib/path` barrel).
 */

import dynamic from "next/dynamic";
import { PageFrame } from "@/components/operate/PageFrame";

const PlannerShell = dynamic(
  () =>
    import("@/components/planner/PlannerShell").then((m) => m.PlannerShell),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[40vh] items-center justify-center"
        role="status"
        aria-label="Loading planner"
      >
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-cyan/40 border-t-cyan" />
      </div>
    ),
  },
);

export default function PlannerRoutePage() {
  return (
    <PageFrame width="content" density="spacious" role="personal">
      <header className="mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan">
          Decision Readiness Intelligence
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-light">
          Budget Planner
        </h1>
        <p className="mt-1 text-sm text-dim">
          Live closed-loop money surface — score owns truth; banks &amp; brokers are demo flows.
        </p>
      </header>
      <PlannerShell />
    </PageFrame>
  );
}
