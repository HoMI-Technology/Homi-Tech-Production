"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { PathPreview } from "@/components/readiness/PathPreview";
import { PathProgressHero } from "@/components/readiness/PathProgressHero";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { useLatestAssessment } from "@/hooks/use-latest-assessment";
import {
  loadReadinessPath,
  pullReadinessPath,
  saveReadinessPath,
  generatePathFromResult,
  completePathStep,
  completePathStepWithImpact,
  completePathStepGuarded,
  financeSnapshotForPath,
  getFinanceSavedAtForPath,
  computeBindingProgress,
  computePathFreshness,
  pathCompletionRatio,
  deriveFundingFromPath,
  applyPathFunding,
  buildPathCoachPack,
  reconcilePathWithSignals,
  loadCouplesAlignment,
  partnerPathNote,
  loadRecurringCapacity,
  saveRecurringCapacity,
  totalRecurringMonthly,
  capacityAfterRecurring,
  PATH_DISCLAIMER,
  derivePathHabitStage,
  pathPendingStepCount,
  pathHabitOncePerSession,
  trackPathPageViewed,
  trackPathHabitImpression,
  trackPathStepDone,
  type ReadinessPath,
  type RecurringItem,
} from "@/lib/readiness";
import { impactBus } from "@/lib/flags";
import { hasSavedFinanceState, loadFinanceState, saveFinanceState } from "@/lib/finance/store";
import { track } from "@/lib/analytics";
import type { VerdictKey } from "@/lib/brand";
import { formatCurrency } from "@/lib/tools/format";
import { Phase0FreezeScreen } from "@/components/advisor/Phase0FreezeScreen";
import { usePhase0Freeze } from "@/hooks/usePhase0Freeze";
import { SURFACE_ROLES } from "@/lib/dashboard/surface-roles";

// Surface role SSOT — living Build over time.
void SURFACE_ROLES.path;

/**
 * Path to Ready — living Build timeline, progress, funding apply, coach prompts.
 * Works anonymous (localStorage) or signed-in (pull/push server).
 */
export default function PathPage() {
  const freeze = usePhase0Freeze();
  const { assessment: latestAssessment } = useLatestAssessment();
  const [path, setPath] = useState<ReadinessPath | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [fundingMsg, setFundingMsg] = useState<string | null>(null);
  const [commitMsg, setCommitMsg] = useState<string | null>(null);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<{
    netCashFlow: number;
    income: number;
    expenses: number;
    windowDays: number;
  } | null>(null);
  const [subs, setSubs] = useState<{
    subscriptionDragMonthly: number;
    recurring: Array<{ name: string; monthlyEstimate: number; category: string }>;
    notes: string[];
  } | null>(null);
  const [recurringName, setRecurringName] = useState("");
  const [recurringAmt, setRecurringAmt] = useState(0);
  const [recurringTick, setRecurringTick] = useState(0);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      // Auto-complete cleared gates from finance + assessment
      const reconciled = reconcilePathWithSignals();
      if (reconciled.completedStepIds.length > 0 && active) {
        setPath(reconciled.path);
        setAutoMsg(reconciled.reasons.join(" "));
        track("path_auto_completed", {
          count: reconciled.completedStepIds.length,
        });
      } else {
        const local = loadReadinessPath();
        if (active) setPath(local);
      }
      try {
        const remote = await pullReadinessPath();
        if (active && remote) setPath(remote);
      } catch {
        // local only
      }
      try {
        const res = await fetch("/api/plaid/cashflow-summary");
        if (res.ok) {
          const json = (await res.json()) as {
            verified?: {
              netCashFlow: number;
              income: number;
              expenses: number;
              windowDays: number;
            } | null;
            categories?: {
              subscriptionDragMonthly: number;
              recurring: Array<{
                name: string;
                monthlyEstimate: number;
                category: string;
              }>;
              notes: string[];
            } | null;
          };
          if (active && json.verified) setVerified(json.verified);
          if (active && json.categories) {
            setSubs({
              subscriptionDragMonthly: json.categories.subscriptionDragMonthly,
              recurring: json.categories.recurring ?? [],
              notes: json.categories.notes ?? [],
            });
          }
        }
      } catch {
        // no bank link
      }
      if (active) setHydrated(true);
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  // Habit measurement: once per session when path page hydrates with a path.
  useEffect(() => {
    if (!hydrated || !path) return;
    if (!pathHabitOncePerSession("path_page_viewed")) return;
    const stage = derivePathHabitStage(path);
    trackPathPageViewed({
      stage,
      pendingSteps: pathPendingStepCount(path),
      mode: path.mode,
    });
    trackPathHabitImpression({
      surface: "path_page",
      stage,
      verdict: path.verdict,
    });
  }, [hydrated, path]);

  const assessment = latestAssessment ?? null;
  const financeSnap = useMemo(() => financeSnapshotForPath(), [path?.id, fundingMsg, hydrated]);

  const progress = useMemo(
    () => computeBindingProgress(path, assessment?.result ?? null, financeSnap),
    [path, assessment, financeSnap],
  );

  const freshness = useMemo(
    () =>
      computePathFreshness(path, {
        financeSavedAt: getFinanceSavedAtForPath(),
      }),
    [path],
  );

  const coach = useMemo(
    () =>
      path
        ? buildPathCoachPack(path, {
            financeSavedAt: getFinanceSavedAtForPath(),
          })
        : null,
    [path],
  );

  const partnerNote = useMemo(() => partnerPathNote(loadCouplesAlignment()), [hydrated, path?.id]);

  const recurring = useMemo(() => loadRecurringCapacity(), [recurringTick, hydrated]);
  const recurringTotal = totalRecurringMonthly(recurring);
  const capacity = useMemo(() => {
    if (!hasSavedFinanceState()) return null;
    const f = loadFinanceState();
    return capacityAfterRecurring(
      f.monthlyIncome,
      f.monthlyExpenses,
      f.monthlyDebtPayments,
      recurringTotal,
    );
  }, [recurringTotal, fundingMsg, hydrated]);

  const funding = useMemo(() => {
    if (!path || !hasSavedFinanceState()) return null;
    return deriveFundingFromPath(path, loadFinanceState());
  }, [path, fundingMsg]);

  const handleGenerate = useCallback(() => {
    const stored = latestAssessment;
    if (!stored) {
      setError("Take an assessment first — Path is built from your readiness score.");
      return;
    }
    const next = generatePathFromResult(stored.result, stored.completedAt);
    saveReadinessPath(next);
    setPath(next);
    setError(null);
    track("path_generated", { verdict: next.verdict, surface: "path_page" });
  }, [latestAssessment]);

  const handleComplete = useCallback((stepId: string) => {
    // Guarded transition either way; only the flag-on branch may publish a
    // toast impact. Analytics observe the real transition, never the click.
    const result = impactBus ? completePathStepWithImpact(stepId) : completePathStepGuarded(stepId);
    if (result.kind === "noop") {
      if (result.path) setPath(result.path);
      return;
    }
    setPath(result.path);
    trackPathStepDone({
      surface: "path_page",
      reasonCode: result.transition.reasonCode,
      evidence: "manual",
      firstStep: result.transition.wasFirstResolution ? 1 : 0,
    });
  }, []);

  const handleSkip = useCallback((stepId: string) => {
    const next = completePathStep(stepId, "skipped");
    if (next) setPath(next);
  }, []);

  const handleApplyTargets = useCallback(() => {
    if (!path || !hasSavedFinanceState()) return;
    const suggestion = deriveFundingFromPath(path, loadFinanceState());
    if (!suggestion.hasActionableDiff) {
      setFundingMsg("Finance already matches path funding targets.");
      return;
    }
    const next = applyPathFunding(loadFinanceState(), suggestion, "targets");
    saveFinanceState(next);
    setFundingMsg("Down-payment / goal targets updated from your path.");
    track("path_funding_applied", { mode: "targets" });
  }, [path]);

  const handleApplySavingsFloor = useCallback(() => {
    if (!path || !hasSavedFinanceState()) return;
    const suggestion = deriveFundingFromPath(path, loadFinanceState());
    if (suggestion.liquidSavingsTarget == null) {
      setFundingMsg("No runway funding gap on pending steps.");
      return;
    }
    const next = applyPathFunding(loadFinanceState(), suggestion, "savings_floor");
    saveFinanceState(next);
    setFundingMsg("Liquid savings updated to the path floor — only do this if that cash is real.");
    track("path_funding_applied", { mode: "savings_floor" });
  }, [path]);

  const handleCommitCalendar = useCallback(async () => {
    if (!path) return;
    setCommitting(true);
    setError(null);
    saveReadinessPath(path);
    try {
      const res = await fetch("/api/readiness-path/commit-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        path?: ReadinessPath;
        error?: string;
        inserted?: number;
      };
      if (!res.ok) {
        if (res.status === 401) {
          setError("Sign in to put this path on your multi-device calendar.");
        } else {
          setError(json.error ?? "Could not commit to calendar.");
        }
        setCommitting(false);
        return;
      }
      if (json.path) {
        saveReadinessPath(json.path);
        setPath(json.path);
      }
      setCommitMsg(
        json.inserted
          ? `Calendar updated — ${json.inserted} milestone(s).`
          : "Path milestones are on your calendar.",
      );
    } catch {
      setError("Network error. Path is still saved locally.");
    }
    setCommitting(false);
  }, [path]);

  if (freeze.status === "pending" || !hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <ProductLoadingSkeleton label="Loading path" />
      </div>
    );
  }

  if (freeze.status === "frozen" && freeze.record) {
    return <Phase0FreezeScreen record={freeze.record} />;
  }

  if (!path) {
    const hasAssessment = !!latestAssessment;
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="glass p-10 text-center">
          <ThresholdCompass size={96} verdict="BUILD_FIRST" className="mx-auto" />
          <p className="eyebrow mt-6">Path to Ready</p>
          <h1 className="mt-2 font-display text-3xl text-light">No active path yet</h1>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            Path turns a readiness verdict into a binding-constraint sequence — not a budget ledger.
            Educational only.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {hasAssessment ? (
              <>
                <button type="button" className="btn btn-primary" onClick={handleGenerate}>
                  Generate from last assessment
                </button>
                <Link href="/dashboard" className="btn btn-ghost">
                  Continue on Home
                </Link>
              </>
            ) : (
              <Link href="/assessment" className="btn btn-primary">
                Take the assessment
              </Link>
            )}
          </div>
          {error && (
            <p className="mt-4 text-sm text-crimson" role="alert">
              {error}
            </p>
          )}
          <p className="mt-6 text-xs text-dim">{PATH_DISCLAIMER}</p>
        </div>
      </div>
    );
  }

  const completion = Math.round(pathCompletionRatio(path) * 100);
  const verdict = path.verdict as VerdictKey;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <p className="eyebrow">Operate · Path to Ready</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-light md:text-4xl">Your path</h1>
          <p className="mt-2 max-w-xl text-sm text-dim">
            Binding constraint first. Complete steps. Reassess when the gate clears — never invent
            readiness.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <VerdictBadge verdict={verdict} size="md" />
          <p className="score-numeral text-sm text-dim">
            Score {path.score}
            {" · "}
            {completion}% resolved
          </p>
        </div>
      </div>

      {freshness.isStale && (
        <div className="mt-6 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3" role="status">
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
            Regenerate from last assessment
          </button>
        </div>
      )}

      {path.mode !== "ready_optional" && (
        <div className="mt-8">
          <PathProgressHero progress={progress} />
        </div>
      )}

      {autoMsg && (
        <p className="mt-4 text-sm text-emerald" role="status">
          Auto-updated: {autoMsg}
        </p>
      )}

      {partnerNote && (
        <div className="glass mt-4 border border-amber/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber">
            Household readiness
          </p>
          <p className="mt-1 text-sm text-light">{partnerNote}</p>
          <Link
            href="/household#couples"
            className="mt-2 inline-block text-sm text-cyan underline-offset-2 hover:underline"
          >
            Open couples alignment
          </Link>
        </div>
      )}

      {verified && (
        <div className="glass mt-4 border border-emerald/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald">
            Bank-verified confidence
          </p>
          <p className="mt-1 text-sm text-light">
            Last {verified.windowDays}d linked cashflow: net{" "}
            <span className="score-numeral">{formatCurrency(verified.netCashFlow)}</span>
            {" · "}in {formatCurrency(verified.income)} · out {formatCurrency(verified.expenses)}
          </p>
          <p className="mt-1 text-xs text-dim">
            VERIFIED block only — self-reported finance may disagree. Path still educational.
          </p>
        </div>
      )}

      {subs && (subs.subscriptionDragMonthly > 0 || subs.recurring.length > 0) && (
        <div className="glass mt-4 border border-yellow/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow">
            Subscription-like capacity drag
          </p>
          <p className="mt-1 text-sm text-light">
            ~ <span className="score-numeral">{formatCurrency(subs.subscriptionDragMonthly)}</span>
            /mo recurring (category heuristic from linked bank)
          </p>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-dim">
            {subs.recurring.slice(0, 8).map((r) => (
              <li key={r.name + r.category} className="flex justify-between gap-2">
                <span>
                  {r.name} <span className="text-dim/80">({r.category})</span>
                </span>
                <span className="score-numeral">{formatCurrency(r.monthlyEstimate)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-dim">
            Awareness only — HōMI does not cancel subscriptions or take a cut of
            &quot;savings.&quot; Review capacity; you decide.
          </p>
          {subs.notes.map((n) => (
            <p key={n} className="mt-1 text-xs text-dim">
              {n}
            </p>
          ))}
        </div>
      )}

      <div className="glass mt-6 border border-slate-surface/70 p-5">
        <p className="eyebrow">Recurring capacity</p>
        <p className="mt-1 text-sm text-dim">
          Fixed monthly obligations as readiness drag — not cancel-for-you.
        </p>
        {recurring.items.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-light">
            {recurring.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span>{item.name}</span>
                <span className="score-numeral text-dim">{formatCurrency(item.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-dim">
          Total fixed:{" "}
          <span className="score-numeral text-light">{formatCurrency(recurringTotal)}</span>
          {capacity != null && (
            <>
              {" · "}capacity after drag{" "}
              <span className={`score-numeral ${capacity < 0 ? "text-crimson" : "text-emerald"}`}>
                {formatCurrency(capacity)}
              </span>
            </>
          )}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input
            className="rounded-lg border border-slate-surface/80 bg-navy/40 px-3 py-2 text-sm text-light"
            placeholder="Name (e.g. childcare)"
            value={recurringName}
            onChange={(e) => setRecurringName(e.target.value)}
          />
          <input
            type="number"
            className="w-28 rounded-lg border border-slate-surface/80 bg-navy/40 px-3 py-2 text-sm text-light"
            placeholder="$/mo"
            value={recurringAmt || ""}
            onChange={(e) => setRecurringAmt(Number(e.target.value) || 0)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (!recurringName.trim() || recurringAmt <= 0) return;
              const item: RecurringItem = {
                id:
                  typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : `rec-${Date.now()}`,
                name: recurringName.trim(),
                amount: recurringAmt,
                category: "fixed",
              };
              saveRecurringCapacity({
                items: [...recurring.items, item],
                updatedAt: new Date().toISOString(),
              });
              setRecurringName("");
              setRecurringAmt(0);
              setRecurringTick((t) => t + 1);
            }}
          >
            Add
          </button>
        </div>
      </div>

      {coach && (
        <div className="glass mt-6 border border-cyan/20 p-5">
          <p className="text-3xs font-semibold uppercase tracking-widest text-cyan">
            Companion board meeting
          </p>
          <p className="mt-2 text-sm leading-relaxed text-light">{coach.boardMeetingLine}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {coach.suggestedPrompts.map((prompt) => (
              <Link
                key={prompt}
                href={`/advisor?q=${encodeURIComponent(prompt)}`}
                className="rounded-full border border-slate-surface/80 bg-navy/40 px-3 py-1.5 text-xs text-dim transition-colors hover:border-cyan/40 hover:text-cyan"
              >
                {prompt}
              </Link>
            ))}
          </div>
        </div>
      )}

      {funding && funding.lines.length > 0 && (
        <div className="glass mt-6 border border-emerald/20 p-5">
          <p className="eyebrow text-emerald">Finance coupling</p>
          <p className="mt-1 font-display text-lg text-light">Path funding targets</p>
          <ul className="mt-3 list-inside list-disc text-sm text-dim">
            {funding.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {hasSavedFinanceState() ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleApplyTargets}
                disabled={!funding.hasActionableDiff && !funding.downPaymentTarget}
              >
                Apply goal targets
              </button>
              {funding.liquidSavingsTarget != null && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleApplySavingsFloor}
                >
                  Record savings floor (if cash is real)
                </button>
              )}
              <Link href="/finance" className="btn btn-ghost btn-sm">
                Open finance
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-dim">
              <Link href="/finance" className="text-cyan underline-offset-2 hover:underline">
                Save finance numbers
              </Link>{" "}
              to couple path funding to the cockpit.
            </p>
          )}
          {fundingMsg && (
            <p className="mt-3 text-sm text-emerald" role="status">
              {fundingMsg}
            </p>
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-display text-xl text-light">Timeline</h2>
        <p className="mt-1 text-sm text-dim">
          Mark steps done as you clear protection signals — not as busywork.
        </p>
        <div className="mt-4">
          <PathPreview steps={path.steps} onComplete={handleComplete} onSkip={handleSkip} />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-slate-surface/60 pt-8 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleCommitCalendar()}
          disabled={committing}
        >
          {committing ? "Committing…" : "Save & put on calendar"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={handleGenerate}>
          Regenerate
        </button>
        <Link href="/dashboard" className="btn btn-ghost">
          Continue on Home
        </Link>
        <Link href="/assessment" className="btn btn-ghost">
          Reassess
        </Link>
        <Link href="/tools/preflight" className="btn btn-ghost">
          Pre-Flight
        </Link>
        <Link href="/scenarios" className="btn btn-ghost">
          Scenarios
        </Link>
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

      <p className="mt-8 text-xs leading-relaxed text-dim">{path.disclaimer || PATH_DISCLAIMER}</p>
    </div>
  );
}
