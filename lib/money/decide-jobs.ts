/**
 * Decide job taxonomy — Money Reality.
 *
 * `/money/decide` groups the lens registry by decision JOB ("Housing decision",
 * "Stability", …) while the public `/tools` hub groups the same lenses by
 * registry RING ("Financial Reality", "Perfect Timing", …). The taxonomies are
 * allowed to read differently; the MEMBERSHIP behind them is not.
 *
 * Membership is therefore DERIVED from `LensDefinition.ring` — never hand-listed.
 * The previous implementation inlined literal id arrays in MoneyDecideHub, so a
 * lens added to `LENSES` appeared on `/tools` automatically and was silently
 * missing from Decide until someone remembered to edit the component. That is
 * exactly the two-places problem `lib/tools/registry.ts` exists to prevent
 * (see its docblock), and `__tests__/money-decide-jobs.test.ts` now fails if it
 * comes back.
 *
 * If product ever needs a job whose membership genuinely diverges from rings
 * (e.g. surfacing `runway` under Housing), add an explicit `job` field to
 * `LensDefinition` and derive from that — do not reintroduce id lists here.
 *
 * Pure TS — no storage, no React. Safe to import anywhere.
 */

import { COLORS } from "@/lib/brand";
import { LENSES, type LensDefinition, type LensRing } from "@/lib/tools/registry";

export type DecideJobId = "housing" | "stability" | "horizon" | "readiness";

export interface DecideJob {
  id: DecideJobId;
  /** Job-framed title — deliberately not the ring title. */
  title: string;
  subtitle: string;
  /** Canonical brand accent for the job. */
  accent: string;
  /** Registry rings whose lenses belong to this job. */
  rings: LensRing[];
}

export const DECIDE_JOBS: DecideJob[] = [
  {
    id: "housing",
    title: "Housing decision",
    subtitle: "What you can carry — not just what a lender will approve.",
    accent: COLORS.cyan,
    rings: ["reality"],
  },
  {
    id: "stability",
    title: "Stability",
    subtitle: "Shock absorption before the leap.",
    accent: COLORS.emerald,
    rings: ["stability"],
  },
  {
    id: "horizon",
    title: "Horizon",
    subtitle: "Independence and path risk — educational, not advice.",
    accent: COLORS.yellow,
    rings: ["timing"],
  },
  {
    id: "readiness",
    title: "Readiness probes",
    subtitle: "Same engine as the assessment — explore levers without a full retest.",
    accent: COLORS.cyan,
    rings: ["readiness"],
  },
];

/** Lenses belonging to a job, in registry declaration order. */
export function lensesForJob(job: DecideJob): LensDefinition[] {
  return LENSES.filter((lens) => job.rings.includes(lens.ring));
}
