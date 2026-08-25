import { COLORS, withAlpha } from "@/lib/brand";

/**
 * Static previews of what sits behind each capability gate.
 *
 * Three rules these obey, and why:
 *
 * 1. **Every number on screen is labelled `Example`.** `homi-product-ui` is explicit
 *    that unlabeled numbers ship — the label is rendered by UpgradePanel outside the
 *    aria-hidden wrapper, so it reaches screen readers too, not just sighted users.
 *    These figures are illustrative shapes, never a projection for the viewer.
 *
 * 2. **No real engine is imported.** It would be tempting to render the actual
 *    Monte Carlo output here, but UpgradePanel is in the static import graph of all
 *    seven /tools/* pages plus the report and household surfaces. Pulling a chart
 *    library through it would ship recharts to /tools/mortgage, which has almost no
 *    Lighthouse script headroom. These are hand-drawn SVG: shape without weight.
 *
 * 3. **They depict output that actually exists.** The percentile fan, the six-topic
 *    couples grid, and the household roster are the real shapes of shipped features.
 *    A preview of something unbuilt would be a fabricated capability claim.
 */

const AXIS = withAlpha(COLORS.light, 0.18);
const LABEL = withAlpha(COLORS.dim, 0.85);

/** Monte Carlo / advanced tooling — a percentile fan converging on a target line. */
export function AdvancedToolsPreview() {
  return (
    <svg viewBox="0 0 320 120" className="h-auto w-full" role="img" aria-label="">
      {/* target line */}
      <line x1="0" y1="34" x2="320" y2="34" stroke={AXIS} strokeWidth="1" strokeDasharray="3 4" />
      <text x="4" y="29" fill={LABEL} fontSize="7" fontFamily="ui-monospace, monospace">
        target
      </text>

      {/* p10–p90 band */}
      <path
        d="M8 96 C 90 92, 150 74, 312 18 L 312 74 C 150 90, 90 98, 8 104 Z"
        fill={withAlpha(COLORS.cyan, 0.16)}
      />
      {/* median */}
      <path
        d="M8 100 C 90 95, 150 84, 312 46"
        fill="none"
        stroke={COLORS.cyan}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* baseline */}
      <line x1="0" y1="112" x2="320" y2="112" stroke={AXIS} strokeWidth="1" />

      <text x="248" y="14" fill={COLORS.emerald} fontSize="8" fontFamily="ui-monospace, monospace">
        p90
      </text>
      <text x="248" y="86" fill={LABEL} fontSize="8" fontFamily="ui-monospace, monospace">
        p10
      </text>
    </svg>
  );
}

const TOPICS = [
  { label: "Timeline", a: 0.72, b: 0.34 },
  { label: "Budget ceiling", a: 0.58, b: 0.61 },
  { label: "Location", a: 0.41, b: 0.83 },
  { label: "Risk appetite", a: 0.66, b: 0.29 },
  { label: "Renovation", a: 0.35, b: 0.44 },
  { label: "Emergency buffer", a: 0.79, b: 0.75 },
];

/** Couples alignment — two partners, six topics, gap shown per row. */
export function CouplesPreview() {
  return (
    <div className="space-y-1.5 px-1 py-1">
      {TOPICS.map((t) => (
        <div key={t.label} className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-right text-3xs leading-none text-dim">
            {t.label}
          </span>
          <span className="relative h-1.5 flex-1 rounded-full bg-slate-surface/70">
            <span
              className="absolute inset-y-0 rounded-full"
              style={{
                left: `${Math.min(t.a, t.b) * 100}%`,
                width: `${Math.abs(t.a - t.b) * 100}%`,
                background: withAlpha(COLORS.cyan, 0.35),
              }}
            />
            <span
              className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
              style={{ left: `${t.a * 100}%`, background: COLORS.cyan }}
            />
            <span
              className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
              style={{ left: `${t.b * 100}%`, background: COLORS.emerald }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

const MEMBERS = [
  { initial: "A", tint: COLORS.cyan },
  { initial: "J", tint: COLORS.emerald },
  { initial: "R", tint: COLORS.yellow },
];

/** Household mode — linked members and a shared goal. */
export function HouseholdPreview() {
  return (
    <div className="space-y-3 px-2 py-2">
      <div className="flex items-center justify-center gap-2">
        {MEMBERS.map((m) => (
          <span
            key={m.initial}
            className="flex h-7 w-7 items-center justify-center rounded-full text-3xs font-semibold"
            style={{ background: withAlpha(m.tint, 0.18), color: m.tint }}
          >
            {m.initial}
          </span>
        ))}
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-high text-3xs text-dim">
          +
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-3xs text-dim">
          <span>Shared goal</span>
          <span className="font-mono">62%</span>
        </div>
        <span className="block h-1.5 w-full rounded-full bg-slate-surface/70">
          <span
            className="block h-1.5 rounded-full"
            style={{ width: "62%", background: COLORS.cyan }}
          />
        </span>
      </div>
    </div>
  );
}
