import { type VerdictKey } from "@/lib/brand";
import {
  resolveVerdictKey,
  verdictMetaFor,
  verdictTempHex,
  type HardStopsInput,
} from "@/components/ui/verdict-ssot";

type ReadinessBarProps = {
  /** Composite readiness score 0–100. */
  score: number;
  /** When set / non-empty, force the NOT_YET (DO NOT PROCEED) band. */
  hardStops?: HardStopsInput;
  /** Optional explicit verdict; when omitted, derived via public SSOT. */
  verdict?: VerdictKey;
  className?: string;
  /** Show score numeral + band label under the track. Default true. */
  showLegend?: boolean;
};

/**
 * Horizontal readiness track colored by the four-band SSOT.
 * Fill width = clamped score; stroke/fill from TEMP_HEX via verdict band.
 */
export function ReadinessBar({
  score,
  hardStops,
  verdict: verdictProp,
  className = "",
  showLegend = true,
}: ReadinessBarProps) {
  const verdict = resolveVerdictKey({
    verdict: verdictProp,
    score,
    hardStops,
  });
  const meta = verdictMetaFor(verdict);
  const fill = verdictTempHex(verdict);
  const pct = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));

  return (
    <div className={`w-full ${className}`}>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-slate-surface/70"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={`Readiness ${Math.round(pct)} — ${meta.label}`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: fill,
            boxShadow: `0 0 12px ${fill}55`,
          }}
        />
      </div>
      {showLegend && (
        <div className="mt-2 flex items-center justify-between gap-3 text-3xs font-medium uppercase tracking-wide text-dim">
          <span className="score-numeral text-light/90">{Math.round(pct)}</span>
          <span style={{ color: meta.color }}>{meta.label}</span>
        </div>
      )}
    </div>
  );
}
