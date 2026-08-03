"use client";

import Link from "next/link";
import type { PathStep, PathStepStatus } from "@/lib/readiness";

const KIND_CHIP: Record<PathStep["kind"], string> = {
  milestone: "border-cyan/40 bg-cyan/10 text-cyan",
  deadline: "border-amber/40 bg-amber/10 text-amber",
  review: "border-emerald/40 bg-emerald/10 text-emerald",
};

function dayLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "In ~1 week";
  if (days < 35) return `In ~${Math.round(days / 7)} weeks`;
  return `In ~${Math.round(days / 30)} mo`;
}

function statusClass(status: PathStepStatus | undefined): string {
  if (status === "done") return "opacity-60 line-through decoration-emerald/50";
  if (status === "skipped") return "opacity-50";
  return "";
}

export function PathPreview({
  steps,
  compact = false,
  onComplete,
  onSkip,
}: {
  steps: PathStep[];
  compact?: boolean;
  onComplete?: (stepId: string) => void;
  onSkip?: (stepId: string) => void;
}) {
  const list = compact ? steps.slice(0, 1) : steps;

  return (
    <ol className="flex flex-col gap-3" aria-label="Path steps">
      {list.map((step, i) => {
        const status = step.status ?? "pending";
        return (
          <li
            key={step.id}
            className={`rounded-xl border border-slate-surface/70 bg-navy/30 p-4 ${statusClass(status)}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="score-numeral flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-surface text-xs font-bold text-cyan">
                {compact ? "→" : i + 1}
              </span>
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${KIND_CHIP[step.kind]}`}
              >
                {step.kind}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-dim">
                {dayLabel(step.daysFromNow)}
              </span>
              {status !== "pending" && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald">
                  {status}
                </span>
              )}
            </div>
            <p className="mt-2 font-display text-base font-semibold text-light">
              {step.title}
            </p>
            {!compact && (
              <p className="mt-1 text-sm leading-relaxed text-dim">{step.notes}</p>
            )}
            {step.fundingTarget != null && step.fundingTarget > 0 && (
              <p className="mt-2 text-xs text-cyan">
                {step.fundingLabel ?? "Target"}:{" "}
                <span className="score-numeral">
                  ${step.fundingTarget.toLocaleString("en-US")}
                </span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={step.href}
                className="text-sm font-semibold text-cyan underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
              >
                Open tool
              </Link>
              {onComplete && status === "pending" && (
                <button
                  type="button"
                  className="text-sm font-semibold text-emerald underline-offset-2 hover:underline"
                  onClick={() => onComplete(step.id)}
                >
                  Mark done
                </button>
              )}
              {onSkip && status === "pending" && (
                <button
                  type="button"
                  className="text-sm text-dim underline-offset-2 hover:underline"
                  onClick={() => onSkip(step.id)}
                >
                  Skip
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
