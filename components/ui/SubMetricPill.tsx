import { type VerdictKey } from "@/lib/brand";
import {
  ratioToScore,
  resolveVerdictKey,
  verdictMetaFor,
  verdictTempHex,
  type HardStopsInput,
} from "@/components/ui/verdict-ssot";

type SubMetricPillBase = {
  label: string;
  className?: string;
  size?: "sm" | "md";
};

/**
 * Color a sub-metric from the same four-band SSOT as VerdictBadge:
 * pass `score` (0–100), or `value`+`max` (normalized via ratioToScore),
 * or an explicit `verdict`.
 */
export type SubMetricPillProps = SubMetricPillBase &
  (
    | { score: number; hardStops?: HardStopsInput; value?: never; max?: never; verdict?: never }
    | { value: number; max: number; hardStops?: HardStopsInput; score?: never; verdict?: never }
    | { verdict: VerdictKey; score?: never; value?: never; max?: never; hardStops?: never }
  );

/** Compact metric chip — band color from public score→verdict SSOT. */
export function SubMetricPill(props: SubMetricPillProps) {
  const { label, className = "", size = "sm" } = props;

  let score: number | undefined;
  if ("score" in props && props.score != null) {
    score = props.score;
  } else if ("value" in props && props.value != null && "max" in props && props.max != null) {
    score = ratioToScore(props.value, props.max);
  }

  const verdict = resolveVerdictKey({
    verdict: "verdict" in props ? props.verdict : undefined,
    score,
    hardStops: "hardStops" in props ? props.hardStops : undefined,
  });
  const meta = verdictMetaFor(verdict);
  const color = verdictTempHex(verdict);
  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-3xs";

  const valueText =
    "value" in props && props.value != null && "max" in props && props.max != null
      ? `${props.value}/${props.max}`
      : score != null
        ? `${Math.round(score)}`
        : meta.label;

  return (
    <span
      data-verdict={verdict}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide ${pad} ${meta.bgClassName} ${className}`}
      style={{ color }}
    >
      <span className="font-medium opacity-80">{label}</span>
      <span className="score-numeral font-bold text-light">{valueText}</span>
    </span>
  );
}
