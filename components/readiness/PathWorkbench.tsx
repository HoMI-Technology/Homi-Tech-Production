"use client";

import Link from "next/link";
import { COLORS } from "@/lib/brand";
import { MAX_PATH_STEPS, type PathStep, type PathStepStatus } from "@/lib/readiness";

type PathBarLabel = "Done" | "Open" | "Queued" | "Skipped";

function statusLabel(status: PathStepStatus | undefined, isNext: boolean): PathBarLabel {
  const resolved: PathStepStatus = status ?? "pending";
  switch (resolved) {
    case "done":
      return "Done";
    case "skipped":
      return "Skipped";
    case "pending":
      return isNext ? "Open" : "Queued";
    default: {
      const _exhaustive: never = resolved;
      return _exhaustive;
    }
  }
}

function statusColor(label: PathBarLabel): string {
  switch (label) {
    case "Done":
      return COLORS.emerald;
    case "Open":
      return COLORS.yellow;
    case "Queued":
    case "Skipped":
      return COLORS.dim;
    default: {
      const _exhaustive: never = label;
      return _exhaustive;
    }
  }
}

/**
 * Finite Path workbench — max 7, one next step, Inter list. No compass, no KPI wall.
 * Open / Queued / Done is the pending bar. Skip stays honest as Skipped.
 */
export function PathWorkbench({
  steps,
  bindingLabel,
  onComplete,
  onSkip,
}: {
  steps: PathStep[];
  bindingLabel: string | null;
  onComplete?: (stepId: string) => void;
  onSkip?: (stepId: string) => void;
}) {
  const list = steps.slice(0, MAX_PATH_STEPS);
  const next = list.find((s) => (s.status ?? "pending") === "pending") ?? null;

  return (
    <div data-path-workbench="">
      {next && (
        <section
          className="rounded-xl border border-cyan/35 bg-navy/40 px-4 py-4 sm:px-5"
          data-path-next-step=""
        >
          <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-cyan">Next step</p>
          <p className="mt-2 text-base font-semibold tracking-tight text-light">{next.title}</p>
          {bindingLabel && (
            <p className="mt-2 text-sm leading-relaxed text-dim">
              Binding constraint · definition of done: {next.notes || bindingLabel}
            </p>
          )}
        </section>
      )}

      <ol className="mt-8 space-y-5" aria-label="Path steps" data-path-step-list="">
        {list.map((step, i) => {
          const status = step.status ?? "pending";
          const isNext = next?.id === step.id;
          const label = statusLabel(status, isNext);
          return (
            <li key={step.id} className="flex items-start gap-3">
              <span className="w-5 shrink-0 pt-0.5 text-sm text-dim">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium tracking-tight text-light">{step.title}</p>
                  <span
                    className="shrink-0 text-sm"
                    data-path-step-status={status}
                    style={{ color: statusColor(label) }}
                  >
                    {label}
                  </span>
                </div>
                {isNext && (
                  <p className="mt-1 text-xs leading-relaxed text-dim">
                    Binding constraint · definition of done: {step.notes}
                  </p>
                )}
                {status === "pending" && onComplete && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="text-sm text-cyan underline-offset-2 hover:underline"
                      onClick={() => onComplete(step.id)}
                    >
                      Mark done
                    </button>
                    {onSkip && (
                      <button
                        type="button"
                        className="text-sm text-dim underline-offset-2 hover:underline"
                        onClick={() => onSkip(step.id)}
                      >
                        Skip
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-dim">
        <Link href="/money/budget" className="underline decoration-white/20 underline-offset-4 hover:text-light">
          Budget · /money/budget
        </Link>
        <Link href="/money/plan" className="underline decoration-white/20 underline-offset-4 hover:text-light">
          Goals · /money/plan
        </Link>
        <Link href="/plan" className="underline decoration-white/20 underline-offset-4 hover:text-light">
          Checklist · /plan
        </Link>
      </p>
    </div>
  );
}
