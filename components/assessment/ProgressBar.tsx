import { COLORS, PILLARS, withAlpha } from "@/lib/brand";

export interface StepMeta {
  pillar: "financial" | "emotional" | "timing" | null;
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
