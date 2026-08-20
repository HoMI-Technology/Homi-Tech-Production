"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AssessmentResult } from "@/lib/scoring";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";
import {
  generatePathFromResult,
  saveReadinessPath,
  loadReadinessPath,
  pullReadinessPath,
  ensurePathForVerdict,
  bindingConstraintLabel,
  PATH_DISCLAIMER,
  PATH_LEGAL_SHORT,
  HARD_STOP_ORDER,
  completePathStep,
  completePathStepWithImpact,
  completePathStepGuarded,
  financeSnapshotForPath,
  getFinanceSavedAtForPath,
  computeBindingProgress,
  computePathFreshness,
  pathCompletionRatio,
  trackPathOffered,
  trackPathGenerated,
  trackPathSaved,
  trackPathCalendarCommitted,
  trackPathStepDone,
  trackPathHabitImpression,
  derivePathHabitStage,
  pathHabitOncePerSession,
  exportPathMarkdown,
  exportPathJson,
  downloadTextFile,
  trackPathExported,
  exposePathPricing,
  pathPricingCopy,
  type PathReasonCode,
  type ReadinessPath,
} from "@/lib/readiness";
import { hasSavedFinanceState } from "@/lib/finance/store";
import { impactBus } from "@/lib/flags";
import { PathPreview } from "./PathPreview";
import { PathProgressHero } from "./PathProgressHero";

export type PathToReadyCardProps = {
  result: AssessmentResult;
  assessmentCompletedAt?: string | null;
  isAnonymous?: boolean;
};

const SIGN_IN_HREF = `/auth/sign-in?next=${encodeURIComponent("/dashboard")}`;

function isReadyCelebrate(result: AssessmentResult): boolean {
  return result.verdict === "READY" && result.hardStops.length === 0;
}

function confidenceLabel(confidence: ReadinessPath["confidence"]): {
  text: string;
  className: string;
} {
  if (confidence === "assessment_plus_finance") {
    return {
      text: "Assessment + finance",
      className: "border-emerald/40 bg-emerald/10 text-emerald",
    };
  }
  return {
    text: "Assessment only",
    className: "border-cyan/40 bg-cyan/10 text-cyan",
  };
}

function softBindingCode(result: AssessmentResult): PathReasonCode | null {
  if (result.hardStops.length > 0) {
    for (const code of HARD_STOP_ORDER) {
      if (result.hardStops.some((s) => s.code === code)) return code;
    }
    return result.hardStops[0]?.code ?? null;
  }
  if (result.verdict === "READY") return "READY_CELEBRATE";

  const ratios = {
    financial: result.financial.total / PILLAR_MAX_POINTS.financial,
    emotional: result.emotional.total / PILLAR_MAX_POINTS.emotional,
    timing: result.timing.total / PILLAR_MAX_POINTS.timing,
  };
  const weakest = (Object.entries(ratios) as [keyof typeof ratios, number][]).sort(
    (a, b) => a[1] - b[1],
  )[0]?.[0];
  if (weakest === "financial") return "PILLAR_FINANCIAL";
  if (weakest === "emotional") return "PILLAR_EMOTIONAL";
  if (weakest === "timing") return "PILLAR_TIMING";
  return null;
}

/**
 * Results-page Path to Ready — progress hero, one-click calendar commit,
 * step completion, staleness. Protective voice; OPERATE density.
 */
export function PathToReadyCard({
  result,
  assessmentCompletedAt = null,
  isAnonymous = false,
}: PathToReadyCardProps) {
  const [path, setPath] = useState<ReadinessPath | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitMsg, setCommitMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readyBand = isReadyCelebrate(result);
  const finance = useMemo(() => financeSnapshotForPath(), [path?.id, hydrated]);

  const progress = useMemo(
    () => computeBindingProgress(path, result, finance),
    [path, result, finance],
  );

  const freshness = useMemo(
    () =>
      computePathFreshness(path, {
        financeSavedAt: getFinanceSavedAtForPath(),
      }),
    [path],
  );

  useEffect(() => {
    let active = true;
    async function hydrate() {
      // Activation: non-READY auto-generates a path on first results view.
      if (!isReadyCelebrate(result)) {
        trackPathOffered({
          source: "results_auto",
          verdict: result.verdict,
          hardStopCount: result.hardStops.length,
        });
        const auto = ensurePathForVerdict(result, assessmentCompletedAt, false);
        if (active && auto) {
          setPath(auto);
          trackPathGenerated({
            source: "results_auto",
            verdict: result.verdict,
            mode: auto.mode,
            stepCount: auto.steps.length,
            auto: 1,
          });
        }
      } else {
        const local = loadReadinessPath();
        if (local && local.verdict === result.verdict && active) setPath(local);
      }
      if (!isAnonymous) {
        const remote = await pullReadinessPath();
        if (active && remote && remote.verdict === result.verdict) {
          setPath(remote);
        }
      }
      if (active) setHydrated(true);
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, [result, assessmentCompletedAt, isAnonymous]);

  useEffect(() => {
    if (!hydrated || !path) return;
    if (!pathHabitOncePerSession("habit_impression:results")) return;
    trackPathHabitImpression({
      surface: "results",
      stage: derivePathHabitStage(path),
      verdict: path.verdict,
    });
  }, [hydrated, path]);

  const handleGenerate = useCallback(() => {
    const next = generatePathFromResult(result, assessmentCompletedAt);
    saveReadinessPath(next);
    setPath(next);
    setCommitMsg(null);
    setError(null);
    trackPathGenerated({
      source: "results_manual",
      verdict: result.verdict,
      mode: next.mode,
      stepCount: next.steps.length,
    });
  }, [result, assessmentCompletedAt]);

  const handleSave = useCallback(() => {
    if (!path) return;
    saveReadinessPath(path);
    setCommitMsg("Path saved on this device.");
    trackPathSaved({ source: "results_manual", stepCount: path.steps.length });
  }, [path]);

  const handleGenerateAndSaveOptional = useCallback(() => {
    const next = generatePathFromResult(result, assessmentCompletedAt);
    saveReadinessPath(next);
    setPath(next);
    trackPathGenerated({
      source: "results_manual",
      verdict: result.verdict,
      mode: next.mode,
      stepCount: next.steps.length,
    });
    trackPathSaved({ source: "results_manual", stepCount: next.steps.length });
  }, [result, assessmentCompletedAt]);

  const handleComplete = useCallback((stepId: string) => {
    // Guarded transition either way; only the flag-on branch may publish a
    // toast impact. Analytics fire once per real transition, and
    // first-resolution truth (no step of any kind was done or skipped
    // before) comes from the transition — not from "first pending step".
    const result = impactBus ? completePathStepWithImpact(stepId) : completePathStepGuarded(stepId);
    if (result.kind === "noop") {
      if (result.path) setPath(result.path);
      return;
    }
    setPath(result.path);
    trackPathStepDone({
      surface: "results",
      reasonCode: result.transition.reasonCode,
      evidence: "manual",
      firstStep: result.transition.wasFirstResolution ? 1 : 0,
    });
  }, []);

  const handleSkip = useCallback((stepId: string) => {
    const next = completePathStep(stepId, "skipped");
    if (next) setPath(next);
  }, []);

  const handleExport = useCallback(
    (format: "md" | "json") => {
      if (!path) return;
      if (format === "md") {
        downloadTextFile(
          `homi-path-${path.id.slice(0, 8)}.md`,
          exportPathMarkdown(path),
          "text/markdown",
        );
      } else {
        downloadTextFile(
          `homi-path-${path.id.slice(0, 8)}.json`,
          exportPathJson(path),
          "application/json",
        );
      }
      trackPathExported({ format });
    },
    [path],
  );

  /** One-click: save + server calendar commit for signed-in users. */
  const handleOneClickCommit = useCallback(async () => {
    if (!path) return;
    setCommitting(true);
    setError(null);
    setCommitMsg(null);

    // Always persist locally first
    saveReadinessPath(path);
    trackPathSaved({ source: "results_manual", stepCount: path.steps.length });

    if (isAnonymous) {
      setCommitting(false);
      setCommitMsg("Path saved. Sign in to put it on your calendar.");
      return;
    }

    try {
      const res = await fetch("/api/readiness-path/commit-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        path?: ReadinessPath;
        inserted?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Could not commit to calendar.");
        setCommitting(false);
        return;
      }
      if (json.path) {
        saveReadinessPath(json.path);
        setPath(json.path);
      }
      setCommitMsg(
        json.inserted && json.inserted > 0
          ? `On your calendar — ${json.inserted} milestone${json.inserted === 1 ? "" : "s"} added.`
          : "Path is on your calendar.",
      );
      trackPathCalendarCommitted({
        inserted: json.inserted ?? 0,
        verdict: path.verdict,
      });
    } catch {
      setError("Network error committing path. Path is still saved locally.");
    }
    setCommitting(false);
  }, [path, isAnonymous]);

  if (!hydrated) {
    return (
      <section
        className="glass mt-8 border border-slate-surface/50 p-6 sm:p-8"
        aria-label="Path to Ready"
        aria-busy="true"
      >
        <p className="eyebrow">Path to Ready</p>
        <p className="mt-2 text-sm text-dim">Loading path…</p>
      </section>
    );
  }

  // ── READY band ────────────────────────────────────────────────────
  if (readyBand && !path) {
    return (
      <section
        className="glass mt-8 flex flex-col items-start justify-between gap-4 border border-emerald/35 p-5 sm:flex-row sm:items-center sm:p-6"
        aria-label="Path to Ready — READY band"
      >
        <div className="min-w-0">
          <p className="eyebrow text-emerald">Path to Ready</p>
          <p className="mt-1 font-display text-lg font-semibold text-light">
            READY band — no forced homework.
          </p>
          <p className="mt-1 text-sm text-dim">
            Protection signals are clear. Optional maintenance keeps the band honest.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerateAndSaveOptional}
          className="btn btn-ghost shrink-0 btn-sm"
        >
          Add optional 90-day review
        </button>
      </section>
    );
  }

  // ── Active / preview path ─────────────────────────────────────────
  if (path) {
    const conf = confidenceLabel(path.confidence);
    const isOptional = path.mode === "ready_optional";
    const completion = Math.round(pathCompletionRatio(path) * 100);

    return (
      <section
        id="path-to-ready"
        className="glass relative mt-8 overflow-hidden border border-cyan/30 p-6 sm:p-8"
        aria-label="Path to Ready"
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/60 to-transparent"
        />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Path to Ready</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-light">
              {isOptional ? "Optional maintenance" : "Your sequenced path"}
            </h2>
            <p className="mt-1 text-sm text-dim">
              Score <span className="score-numeral text-light">{path.score}</span>
              {" · "}
              {path.verdict === "NOT_YET" ? "DO NOT PROCEED" : path.verdict.replace("_", " ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide ${conf.className}`}
            >
              {conf.text}
            </span>
            {!isOptional && (
              <span className="inline-flex items-center rounded-full border border-slate-surface/80 px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide text-dim">
                <span className="score-numeral mr-1 text-light">{completion}</span>% resolved
              </span>
            )}
          </div>
        </div>

        {freshness.isStale && (
          <div
            className="mt-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3"
            role="status"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-amber">
              Path may be stale
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-light">
              {freshness.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-ghost mt-3 btn-xs text-sm"
              onClick={handleGenerate}
            >
              Regenerate from this assessment
            </button>
          </div>
        )}

        {!isOptional && (
          <div className="mt-5">
            <PathProgressHero progress={progress} />
          </div>
        )}

        <div className="mt-5">
          <PathPreview steps={path.steps} onComplete={handleComplete} onSkip={handleSkip} />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => void handleOneClickCommit()}
            className="btn btn-primary text-sm"
            disabled={committing}
            aria-label={
              isAnonymous
                ? "Save path and prepare calendar commit"
                : "Save path and put milestones on calendar"
            }
          >
            {committing
              ? "Committing…"
              : isAnonymous
                ? "Save path"
                : path.calendarCommittedAt
                  ? "Update calendar milestones"
                  : "Save & put on calendar"}
          </button>

          {isAnonymous && (
            <Link href={SIGN_IN_HREF} className="btn btn-emerald text-sm">
              Sign in for multi-device path
            </Link>
          )}

          <Link href="/path" className="btn btn-emerald text-sm">
            Open full path
          </Link>

          {!isAnonymous && path.calendarCommittedAt && (
            <Link href="/calendar" className="btn btn-ghost text-sm">
              Open calendar
            </Link>
          )}

          <button type="button" onClick={handleSave} className="btn btn-ghost text-sm">
            Save only
          </button>

          <button type="button" onClick={handleGenerate} className="btn btn-ghost text-sm">
            Regenerate
          </button>
          <button
            type="button"
            onClick={() => handleExport("md")}
            className="btn btn-ghost text-sm"
          >
            Export Markdown
          </button>
          <button
            type="button"
            onClick={() => handleExport("json")}
            className="btn btn-ghost text-sm"
          >
            Export JSON
          </button>
        </div>

        {commitMsg && (
          <p className="mt-3 text-sm text-emerald" role="status">
            {commitMsg}
          </p>
        )}
        {error && (
          <p className="mt-3 text-sm text-crimson" role="alert">
            {error}
          </p>
        )}

        <PathPricingStrip />

        <p className="mt-5 text-xs leading-relaxed text-dim">
          {path.disclaimer || PATH_DISCLAIMER}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-dim">{PATH_LEGAL_SHORT}</p>
      </section>
    );
  }

  // ── Build prompt ──────────────────────────────────────────────────
  const constraint = bindingConstraintLabel(softBindingCode(result));
  const conf = confidenceLabel(
    hasSavedFinanceState() ? "assessment_plus_finance" : "assessment_only",
  );

  return (
    <section
      id="path-to-ready"
      className="glass relative mt-8 overflow-hidden border border-cyan/30 p-6 sm:p-8"
      aria-label="Path to Ready"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent"
      />
      <p className="eyebrow">Path to Ready</p>
      <h2 className="mt-1 font-display text-xl font-semibold text-light">
        Turn this verdict into sequenced moves
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">
        One binding constraint at a time — protection signal first, not a checklist wall.
        Educational readiness only.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1 text-xs font-medium text-amber">
          {constraint}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide ${conf.className}`}
        >
          {conf.text}
        </span>
        {result.hardStops.length > 0 && (
          <span className="inline-flex items-center rounded-full border border-crimson/40 bg-crimson/10 px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide text-crimson">
            Protection signal
          </span>
        )}
      </div>

      <div className="mt-6">
        <button type="button" onClick={handleGenerate} className="btn btn-primary">
          Generate Path to Ready
        </button>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-dim">{PATH_DISCLAIMER}</p>
      <p className="mt-2 text-xs leading-relaxed text-dim">{PATH_LEGAL_SHORT}</p>
    </section>
  );
}

function PathPricingStrip() {
  const [copy, setCopy] = useState<ReturnType<typeof pathPricingCopy> | null>(null);
  useEffect(() => {
    const a = exposePathPricing("results_path_card");
    setCopy(pathPricingCopy(a.variant));
  }, []);
  if (!copy) return null;
  return (
    <div className="mt-5 rounded-xl border border-slate-surface/70 bg-navy/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan">{copy.headline}</p>
      <p className="mt-1 text-sm text-dim">{copy.body}</p>
      <Link
        href={copy.href}
        className="mt-2 inline-block text-sm font-semibold text-cyan underline-offset-2 hover:underline"
      >
        {copy.cta}
      </Link>
    </div>
  );
}
