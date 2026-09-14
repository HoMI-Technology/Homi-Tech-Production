/**
 * Path to Ready v1 — shared pure types.
 *
 * The Path CONSUMES the scoring engine's verdict and hard-stops as recorded
 * inputs; it never recomputes or modifies them. No scoring math lives here —
 * no composite score, no verdict derivation. The diagnosis snapshot carries
 * pillar totals only so the plan can show what it was generated from.
 *
 * All money is integer cents. All dates are date-only (YYYY-MM-DD).
 * Everything in this module is pure and deterministic: same input → same path.
 */

/** Verdict tiers as recorded by lib/scoring/engine.ts — consumed, never derived. */
export type PathVerdict = "READY" | "ALMOST_THERE" | "BUILD_FIRST" | "NOT_YET";

/** Hard-stop codes as recorded by the scoring engine — consumed, never re-detected. */
export type PathHardStopCode =
  | "DTI_OVER_50"
  | "HOUSING_RATIO_OVER_45"
  | "RUNWAY_UNDER_1_MONTH"
  | "CREDIT_UNDER_620";

/** A hard-stop exactly as the scoring engine recorded it. */
export interface RecordedHardStop {
  code: PathHardStopCode;
  message: string;
}

export type PathPillarKey = "financial" | "emotional" | "timing";

/** Pillar totals as recorded (points earned / points possible). Never a composite score. */
export interface PillarSnapshotEntry {
  total: number;
  max: number;
}

export interface PathPillarSnapshot {
  financial: PillarSnapshotEntry;
  emotional: PillarSnapshotEntry;
  timing: PillarSnapshotEntry;
}

/** Completeness grade from lib/finance/readiness-snapshot.ts (via metrics.ts evidence). */
export type PathCompleteness = "low" | "medium" | "high";

/**
 * The metric bundle the path generator reads. Adapted from
 * lib/finance/metrics.ts `NamedMoneyMetrics` at the route boundary — null
 * means "unknown", never zero. Zero is a recorded fact; null is honesty.
 */
export interface PathMetricsInput {
  /** Date-only stamp of the underlying ledger data. */
  asOf: string | null;
  completeness: PathCompleteness;
  monthsWithData: number;
  monthlyIncomeCents: number | null;
  /** Monthly expenses + debt payments (the runway basis). */
  monthlyOutflowCents: number | null;
  monthlyDebtPaymentsCents: number | null;
  liquidSavingsCents: number | null;
  runwayMonths: number | null;
  dtiPct: number | null;
  surplusCents: number | null;
}

/** An active finance_savings_goals row, bridged into the generator. */
export interface PathGoalInput {
  id: string;
  name: string;
  goalType:
    | "emergency_reserve"
    | "home"
    | "vehicle"
    | "education"
    | "family"
    | "travel"
    | "custom";
  targetAmountCents: number;
  currentAmountCents: number;
  targetDate: string | null;
}

export type PathMilestoneKind =
  | "hard_stop"
  | "savings"
  | "debt"
  | "credit"
  | "timing"
  | "evidence";

export type PathMilestoneStatus = "pending" | "active" | "done" | "skipped";

/**
 * Where a milestone's amount/date came from, and how far it can be trusted.
 * `confidenceCap` is the ceiling imposed by the underlying data's
 * completeness grade (lib/path/confidence.ts) — a milestone built on thin
 * data must never present as certain.
 */
export interface MilestoneProvenance {
  /** What the target is derived from. `insufficient_data` = amount withheld. */
  basis: "metric" | "goal" | "assessment" | "insufficient_data";
  /** Named metric (e.g. "dti", "runway") or null. */
  metric: string | null;
  /** The recorded value the target was derived from, or null. */
  valueCents: number | null;
  /** Completeness of the underlying data, or null when not metric-backed. */
  completeness: PathCompleteness | null;
  /** 0..1 ceiling on how confidently this target can be presented. */
  confidenceCap: number;
  /** The finance_savings_goals id, when the milestone bridges a goal. */
  goalId?: string | null;
}

/** One generated milestone. Ids are deterministic (`path-m01`, …). */
export interface PathMilestoneDraft {
  id: string;
  title: string;
  description: string;
  kind: PathMilestoneKind;
  /** Date-only; null when no honest date exists. */
  targetDate: string | null;
  /** Integer cents; null when inputs are missing — never invented. */
  targetAmountCents: number | null;
  fundingSource: MilestoneProvenance;
  /** Lens id from lib/tools/registry.ts, or null. Validated in app code. */
  toolSlug: string | null;
  /** Deterministic id of an earlier milestone, or null. Never forward/cyclic. */
  dependsOn: string | null;
  sortOrder: number;
  status: "pending";
}

/** What a plan was generated FROM — the recorded diagnosis, with timestamps. */
export interface PathDiagnosis {
  verdict: PathVerdict;
  hardStops: RecordedHardStop[];
  pillars: PathPillarSnapshot;
  metricsAsOf: string | null;
  /** Date-only generation day. */
  generatedAt: string;
  assessmentId: string | null;
}

export interface BindingConstraint {
  /** Hard-stop code or `pillar:<key>`. */
  code: string;
  label: string;
  /** Neutral, protective wording — "the constraint to resolve first". */
  rationale: string;
  /** Pointers to the recorded evidence (never recomputed values). */
  evidenceRefs: string[];
}

export interface GeneratePathInput {
  verdict: PathVerdict;
  hardStops: RecordedHardStop[];
  pillars: PathPillarSnapshot;
  metrics: PathMetricsInput | null;
  goals: PathGoalInput[];
  /** Date-only (YYYY-MM-DD) — injected by the route, fixed in tests. */
  asOfDate: string;
  assessmentId?: string | null;
  /** Defaults to 1; the route bumps it when superseding a prior plan. */
  version?: number;
}

export interface GeneratedPath {
  version: number;
  bindingConstraint: BindingConstraint;
  diagnosis: PathDiagnosis;
  milestones: PathMilestoneDraft[];
}
