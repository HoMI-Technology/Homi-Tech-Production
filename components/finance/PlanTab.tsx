"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AssessmentResult } from "@/lib/scoring";
import { loadLocalResult } from "@/lib/assessment/storage";
import {
  bindingConstraintLabel,
  completePathStep,
  ensurePathForVerdict,
  generatePathFromResult,
  loadReadinessPath,
  pathCompletionRatio,
  saveReadinessPath,
  setPathStepStatus,
  type PathStepStatus,
  type ReadinessPath,
} from "@/lib/readiness";
import { LEGAL_DISCLAIMER } from "@/lib/brand";
import { ThresholdCompass } from "@/components/finance/ThresholdCompass";
import { PillarBreakdown } from "@/components/finance/PillarBreakdown";
import { HardStopBanner } from "@/components/finance/HardStopBanner";
import { WarningsBanner } from "@/components/finance/WarningsBanner";

export function PlanTab() {
  const [stored, setStored] = useState<{ result: AssessmentResult; completedAt: string } | null>(null);
  const [path, setPath] = useState<ReadinessPath | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const local = loadLocalResult();
    if (local && active) {
      setStored({ result: local.result, completedAt: local.completedAt });
    }
    const savedPath = loadReadinessPath();
    if (savedPath && active) {
      setPath(savedPath);
    }
    setHydrated(true);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!stored || !hydrated) return;
    const existing = loadReadinessPath();
    if (existing && existing.verdict === stored.result.verdict) {
      setPath(existing);
      return;
    }
    const auto = ensurePathForVerdict(stored.result, stored.completedAt, false);
    if (auto) {
      setPath(auto);
      saveReadinessPath(auto);
    }
  }, [stored, hydrated]);

  const handleRefresh = useCallback(() => {
    if (!stored) return;
    const next = generatePathFromResult(stored.result, stored.completedAt);
    setPath(next);
    saveReadinessPath(next);
  }, [stored]);

  const handleStepStatus = useCallback((stepId: string, status: PathStepStatus) => {
    setPath((prev) => {
      if (!prev) return prev;
      const next =
        status === "pending"
          ? setPathStepStatus(prev, stepId, status)
          : completePathStep(stepId, status) ?? setPathStepStatus(prev, stepId, status);
      saveReadinessPath(next);
      return next;
    });
  }, []);

  const completion = useMemo(() => {
    if (!path) return 0;
    return Math.round(pathCompletionRatio(path) * 100);
  }, [path]);

  if (!hydrated) {
    return (
      <section className="glass border border-slate-surface/50 p-6 sm:p-8" aria-busy="true">
        <p className="text-sm text-dim">Loading plan…</p>
      </section>
    );
  }

  if (!stored) {
    return (
      <section className="glass border border-slate-surface/50 p-6 sm:p-8 text-center sm:text-left">
        <p className="eyebrow">HōMI Readiness</p>
        <h2 className="mt-2 font-display text-xl font-semibold text-light">
          No readiness verdict yet
        </h2>
        <p className="mt-2 max-w-xl text-sm text-dim">
          Take the 45-question assessment to see your HōMI-Score and Build Path.
        </p>
        <div className="mt-6">
          <Link href="/assessment" className="btn btn-primary text-sm">
            Start assessment
          </Link>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-dim">{LEGAL_DISCLAIMER}</p>
      </section>
    );
  }

  const { result } = stored;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ThresholdCompass result={result} />
        </div>
        <div className="lg:col-span-5">
          <PillarBreakdown result={result} />
        </div>
      </div>

      <HardStopBanner result={result} />
      <WarningsBanner result={result} />

      <section
        className="glass relative overflow-hidden border border-cyan/30 p-6 sm:p-8"
        aria-label="Build Path"
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent"
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Build Path</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-light">
              {path?.mode === "ready_optional" ? "Optional maintenance" : "Your sequenced path"}
            </h2>
            {path && (
              <p className="mt-1 text-sm text-dim">
                Score <span className="score-numeral text-light">{path.score}</span>
                {" · "}
                {path.verdict === "NOT_YET" ? "DO NOT PROCEED" : path.verdict.replace("_", " ")}
              </p>
            )}
          </div>
          {path && (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1 text-xs font-medium text-amber">
                {bindingConstraintLabel(path.bindingConstraint)}
              </span>
              {path.mode !== "ready_optional" && (
                <span className="inline-flex items-center rounded-full border border-slate-surface/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-dim">
                  <span className="score-numeral mr-1 text-light">{completion}</span>% resolved
                </span>
              )}
            </div>
          )}
        </div>

        {path && path.mode !== "ready_optional" && (
          <div className="mt-5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-surface/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-emerald transition-all duration-500"
                style={{ width: `${completion}%` }}
                aria-hidden
              />
            </div>
            <p className="mt-2 text-xs text-dim">{completion}% complete</p>
          </div>
        )}

        {path ? (
          <ol className="mt-5 space-y-3">
            {path.steps.map((step, index) => (
              <li
                key={step.id}
                className={`rounded-lg border p-4 transition-colors ${
                  step.status === "pending"
                    ? "border-slate-surface/70 bg-navy/30"
                    : "border-emerald/30 bg-emerald/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      step.status === "pending"
                        ? "bg-slate-surface/80 text-dim"
                        : "bg-emerald/20 text-emerald"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-light">{step.title}</p>
                    <p className="mt-1 text-sm text-dim">{step.notes}</p>
                    {step.fundingTarget != null && step.fundingTarget > 0 && (
                      <p className="mt-2 text-xs text-cyan">
                        {step.fundingLabel ?? "Target"}: ${step.fundingTarget.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 pl-9">
                  {step.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStepStatus(step.id, "done")}
                        className="btn btn-emerald btn-xs text-xs"
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepStatus(step.id, "skipped")}
                        className="btn btn-ghost btn-xs text-xs"
                      >
                        Skip
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStepStatus(step.id, "pending")}
                      className="btn btn-ghost btn-xs text-xs"
                    >
                      Undo
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-6">
            <p className="text-sm text-dim">
              No path generated yet. Refresh to build your first sequence.
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="btn btn-primary mt-4 text-sm"
            >
              Build Path
            </button>
          </div>
        )}

        {path && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={handleRefresh} className="btn btn-ghost text-sm">
              Refresh from live numbers
            </button>
            <Link href="/path" className="btn btn-emerald text-sm">
              Open full path
            </Link>
          </div>
        )}

        <p className="mt-6 text-xs leading-relaxed text-dim">{LEGAL_DISCLAIMER}</p>
      </section>
    </div>
  );
}
