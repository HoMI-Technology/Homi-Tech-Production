import { COLORS, PILLARS, withAlpha } from "@/lib/brand";
import type { Dimension } from "@/lib/questions/bank";

export interface StepMeta {
  pillar: "financial" | "emotional" | "timing" | null;
}

/**
 * Path-true progress for Option 1. Never "Question N of 45".
 * Tilde on the denominator is an estimate for this path.
 */
export function PathProgressChrome({
  dimension,
  label,
  current,
  estimate,
  quiet = false,
}: {
  dimension: Dimension;
  label: string;
  current: number;
  estimate: number;
  quiet?: boolean;
}) {
  const color = PILLARS.find((p) => p.key === dimension)?.color ?? COLORS.cyan;
  const pct = estimate > 0 ? Math.min(100, Math.max(0, (current / estimate) * 100)) : 0;

  return (
    <div className={quiet ? "mb-4" : "mb-8"}>
      <p
        className="text-sm font-medium"
        style={{ color }}
        data-path-progress=""
        data-progress-chrome="path"
      >
        {label}
      </p>
      {quiet ? null : (
        <div
          className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-slate-surface/60"
          role="progressbar"
          aria-label={label}
          aria-valuenow={current}
          aria-valuemin={1}
          aria-valuemax={estimate}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Pillar-colored segmented progress bar. Segments are grouped by pillar
 * (or neutral for intro/review steps) with the completed portion filled.
 */
export function ProgressBar({ steps, currentIndex }: { steps: StepMeta[]; currentIndex: number }) {
  const colorFor = (pillar: StepMeta["pillar"]) => {
    if (!pillar) return withAlpha(COLORS.dim, 0.4);
    return PILLARS.find((p) => p.key === pillar)?.color ?? withAlpha(COLORS.dim, 0.4);
  };

  return (
    <div
      className="flex w-full gap-1.5"
      role="progressbar"
      aria-label="Assessment progress"
      aria-valuenow={currentIndex + 1}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      data-progress-chrome="segmented"
    >
      {steps.map((step, i) => {
        const done = i <= currentIndex;
        return (
          <div
            key={i}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-surface/60 transition-all duration-300"
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: done ? "100%" : "0%",
                background: colorFor(step.pillar),
                boxShadow: done ? `0 0 8px ${colorFor(step.pillar)}` : "none",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
