import { type VerdictKey } from "@/lib/brand";
import {
  resolveVerdictKey,
  verdictMetaFor,
  type HardStopsInput,
} from "@/components/ui/verdict-ssot";

type Size = "sm" | "md" | "lg";

type VerdictBadgeBase = {
  size?: Size;
  className?: string;
  /** Hide the · Cool/Warm temperature suffix. */
  hideTemperature?: boolean;
};

/**
 * Pass either a resolved `verdict`, or a `score` (+ optional `hardStops`)
 * so the badge maps through the public SSOT (`scoreToVerdict`) — callers
 * must not invent band thresholds.
 */
export type VerdictBadgeProps = VerdictBadgeBase &
  (
    | { verdict: VerdictKey; score?: never; hardStops?: never }
    | { score: number; hardStops?: HardStopsInput; verdict?: never }
  );

/** Verdict chip — exact proprietary verdict colors, temperature metaphor. */
export function VerdictBadge(props: VerdictBadgeProps) {
  const { size = "md", className = "", hideTemperature = false } = props;
  const verdict = resolveVerdictKey({
    verdict: "verdict" in props ? props.verdict : undefined,
    score: "score" in props ? props.score : undefined,
    hardStops: "hardStops" in props ? props.hardStops : undefined,
  });
  const meta = verdictMetaFor(verdict);
  const pad =
    size === "lg"
      ? "px-6 py-3 text-lg"
      : size === "sm"
        ? "px-3 py-1 text-xs"
        : "px-4 py-1.5 text-sm";

  // Accessible name without role="status": the badge is a static reading,
  // not a live-region announcement (canon review of PR #326).
  const accessibleName = hideTemperature
    ? meta.label
    : `${meta.label}, ${meta.temperature}`;

  return (
    <span
      data-verdict={verdict}
      aria-label={accessibleName}
      className={`inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border font-bold tracking-wide ${pad} ${meta.bgClassName} ${className}`}
      style={{ color: meta.color }}
    >
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
        aria-hidden
      />
      {meta.label}
      {!hideTemperature && (
        <span className="font-normal opacity-70">· {meta.temperature}</span>
      )}
    </span>
  );
}
