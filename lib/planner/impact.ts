/* ------------------------------------------------------------------ */
/* Closed-loop impact — compare readiness before/after an action.      */
/* Production ScoreResult uses hardStops: HardStopReason[].            */
/* ------------------------------------------------------------------ */

import { PILLARS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import type { ScoreResult } from "@/lib/planner/score-result";
import type { ScoreImpactSnapshot } from "@/lib/planner/types";

export type ImpactActionKind = "bill_paid" | "path_done" | "path_skipped" | "checkin" | "generic";

export interface ScoreImpact {
  id: string;
  reason: string;
  actionKind: ImpactActionKind;
  fromScore: number;
  toScore: number;
  fromVerdict: VerdictKey;
  toVerdict: VerdictKey;
  delta: number;
  hardStopsCleared: number;
  hardStopsAdded: number;
  pillarDeltas: {
    financial: number;
    emotional: number;
    timing: number;
  };
  headline: string;
  detail: string;
  nextHint: string;
  at: string;
  pathProgress?: { before: number; after: number };
  stepTitle?: string;
  alreadyDone?: boolean;
}

type PillarKey = "financial" | "emotional" | "timing";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function classifyAction(reason: string): ImpactActionKind {
  const r = reason.toLowerCase();
  if (r.includes("bill")) return "bill_paid";
  if (r.includes("skip")) return "path_skipped";
  if (r.includes("path")) return "path_done";
  if (r.includes("check")) return "checkin";
  return "generic";
}

function pillarLabel(key: PillarKey): string {
  return PILLARS.find((p) => p.key === key)?.name ?? key;
}

function pillarNarrative(
  before: ScoreResult,
  after: ScoreResult,
): { deltas: ScoreImpact["pillarDeltas"]; line: string | null } {
  const deltas = {
    financial: round1(after.pillars.financial.total - before.pillars.financial.total),
    emotional: round1(after.pillars.emotional.total - before.pillars.emotional.total),
    timing: round1(after.pillars.timing.total - before.pillars.timing.total),
  };
  const ranked: Array<[string, number]> = (["financial", "emotional", "timing"] as PillarKey[]).map(
    (key) => [pillarLabel(key), deltas[key]],
  );
  ranked.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  const top = ranked[0];
  if (!top || Math.abs(top[1]) < 0.3) {
    return { deltas, line: null };
  }
  const dir = top[1] > 0 ? "lifted" : "softened";
  return {
    deltas,
    line: `${top[0]} ${dir} ${Math.abs(top[1]).toFixed(1)} pts — the main mover.`,
  };
}

function hardStopCodes(result: ScoreResult): Set<string> {
  return new Set(result.hardStops.map((h) => h.code));
}

export function buildScoreImpact(
  before: ScoreResult,
  after: ScoreResult,
  reason: string,
): ScoreImpact {
  const delta = round1(after.score - before.score);
  const beforeCodes = hardStopCodes(before);
  const afterCodes = hardStopCodes(after);
  let hardStopsCleared = 0;
  let hardStopsAdded = 0;
  for (const c of beforeCodes) if (!afterCodes.has(c)) hardStopsCleared++;
  for (const c of afterCodes) if (!beforeCodes.has(c)) hardStopsAdded++;

  const actionKind = classifyAction(reason);
  const { deltas: pillarDeltas, line: pillarLine } = pillarNarrative(before, after);
  const fromV = VERDICT_META[before.verdict];
  const toV = VERDICT_META[after.verdict];
  const verdictShift = before.verdict !== after.verdict;

  let headline: string;
  if (hardStopsCleared > 0 && delta >= 0) {
    headline =
      hardStopsCleared === 1
        ? "Hard-stop cleared — protection held, room opened"
        : `${hardStopsCleared} hard-stops cleared`;
  } else if (hardStopsAdded > 0) {
    headline = "New hard-stop surfaced — honesty before speed";
  } else if (verdictShift && delta > 0) {
    headline = `Verdict advanced · ${fromV.label} → ${toV.label}`;
  } else if (verdictShift && delta < 0) {
    headline = `Verdict tightened · ${fromV.label} → ${toV.label}`;
  } else if (delta > 0.5) {
    headline =
      actionKind === "bill_paid"
        ? "Bill closed the loop — readiness up"
        : actionKind === "path_done"
          ? "Path step completed — readiness up"
          : actionKind === "checkin"
            ? "Check-in recorded — score recalibrated"
            : "Action registered — readiness up";
  } else if (delta < -0.5) {
    headline =
      actionKind === "checkin"
        ? "Stress noted — score stayed honest"
        : actionKind === "bill_paid"
          ? "Cash moved — score adjusted honestly"
          : "Position changed — score stayed honest";
  } else {
    headline =
      actionKind === "bill_paid"
        ? "Bill paid — cash & ledger updated"
        : actionKind === "path_done"
          ? "Step locked in"
          : actionKind === "path_skipped"
            ? "Step skipped — path stays truthful"
            : actionKind === "checkin"
              ? "Check-in saved — pattern updated"
              : "Closed loop registered";
  }

  const parts: string[] = [];
  if (Math.abs(delta) >= 0.05) {
    parts.push(
      `Decision Readiness Score ${before.score.toFixed(0)} → ${after.score.toFixed(0)} (${delta > 0 ? "+" : ""}${delta.toFixed(1)}).`,
    );
  } else if (actionKind === "path_done" || actionKind === "path_skipped") {
    parts.push(
      `Decision Readiness Score held at ${after.score.toFixed(0)} — path advanced; score moves when cash, DTI, or runway change.`,
    );
  } else {
    parts.push(
      `Decision Readiness Score held at ${after.score.toFixed(0)} — the loop still updated cash, path, or signals.`,
    );
  }
  if (pillarLine) parts.push(pillarLine);
  if (hardStopsCleared > 0) {
    parts.push(`Cleared ${hardStopsCleared} hard-stop${hardStopsCleared > 1 ? "s" : ""}.`);
  }
  if (hardStopsAdded > 0) {
    const added = after.hardStops.find((h) => !beforeCodes.has(h.code));
    parts.push(added ? `New stop: ${added.message}` : `${hardStopsAdded} new hard-stop(s).`);
  }

  let nextHint: string;
  if (hardStopsAdded > 0) {
    nextHint = "Open Plan and face the binding constraint before new stretch.";
  } else if (hardStopsCleared > 0) {
    nextHint = "Don't rush the win — regenerate Path and take the next pending step.";
  } else if (actionKind === "bill_paid" && after.hardStops.length === 0) {
    nextHint = "If Path is open, mark the related step done to lock the loop.";
  } else if (actionKind === "path_done") {
    nextHint = "Glance at signals — the next binding step should now lead.";
  } else if (actionKind === "checkin" && delta < 0) {
    nextHint = "Name the driver in one sentence, then act on a bill or Path step.";
  } else if (delta > 0.5) {
    nextHint = "Reinforce the same class of action — don't stack ten new habits.";
  } else {
    nextHint = "Check signals for the single highest-leverage next move.";
  }

  return {
    id: `impact_${Date.now()}`,
    reason,
    actionKind,
    fromScore: before.score,
    toScore: after.score,
    fromVerdict: before.verdict,
    toVerdict: after.verdict,
    delta,
    hardStopsCleared,
    hardStopsAdded,
    pillarDeltas,
    headline,
    detail: parts.join(" "),
    nextHint,
    at: new Date().toISOString(),
  };
}

export function impactToSnapshot(impact: ScoreImpact): ScoreImpactSnapshot {
  return {
    id: impact.id,
    reason: impact.reason,
    fromScore: impact.fromScore,
    toScore: impact.toScore,
    fromVerdict: impact.fromVerdict,
    toVerdict: impact.toVerdict,
    delta: impact.delta,
    hardStopsCleared: impact.hardStopsCleared,
    hardStopsAdded: impact.hardStopsAdded,
    at: impact.at,
    detail: impact.detail,
    headline: impact.headline,
    nextHint: impact.nextHint,
    actionKind: impact.actionKind,
    pillarDeltas: impact.pillarDeltas,
    pathProgress: impact.pathProgress,
    stepTitle: impact.stepTitle,
    alreadyDone: impact.alreadyDone,
  };
}
