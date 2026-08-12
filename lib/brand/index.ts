/**
 * HōMI Brand Core — locked to CANON.md + lib/brand/homi-tokens.json.
 * These values are immutable for production. Never approximate.
 * Token JSON is a derived lock (not imported at runtime); TS here remains authority with CSS `@theme`.
 */

export const BRAND = {
  name: "HōMI",
  display: "HōMI",
  legalEntity: "HOMI TECHNOLOGIES LLC",
  domain: "homitechnology.com",
  category: "Decision Readiness Intelligence™",
} as const;

/**
 * Canonical brand palette — must match app/globals.css `@theme` exactly
 * (--color-cyan … --color-dim). TSX/SVG/imperative code that cannot use a
 * CSS `var(--color-*)` must reference these constants, never raw hex.
 */
export const COLORS = {
  cyan: "#22d3ee",
  emerald: "#34d399",
  yellow: "#facc15",
  amber: "#fab633",
  crimson: "#f24822",
  navy: "#0a1628",
  navyLight: "#0f172a",
  slateSurface: "#1e293b",
  slateHigh: "#334155",
  ink: "#ffffff",
  light: "#e2e8f0",
  dim: "#94a3b8",
} as const;

/**
 * Derive an rgba() string from a canonical 6-digit hex + alpha, so TSX style
 * objects and SVG stops never hardcode the channel triplet.
 * withAlpha(COLORS.cyan, 0.4) === "rgba(34, 211, 238, 0.4)"
 */
export function withAlpha(hex: string, alpha: number): string {
  // Guard: only canonical 6-digit hex is a valid input. Shorthand (#fff),
  // 8-digit (#22d3ee55), or non-hex strings would silently yield NaN channels.
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new RangeError(
      `withAlpha expects a 6-digit hex color (e.g. a COLORS token), got "${hex}".`,
    );
  }
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new RangeError(`withAlpha expects an alpha in [0, 1], got ${alpha}.`);
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type VerdictKey = "READY" | "ALMOST_THERE" | "BUILD_FIRST" | "NOT_YET";

export const VERDICT_META: Record<
  VerdictKey,
  {
    label: string;
    color: string;
    temperature: string;
    className: string;
    bgClassName: string;
    line: string;
  }
> = {
  READY: {
    label: "READY",
    color: COLORS.emerald,
    temperature: "Cool",
    className: "verdict-ready",
    bgClassName: "bg-verdict-ready",
    line: "All three rings align. Your compass becomes a key.",
  },
  ALMOST_THERE: {
    label: "ALMOST THERE",
    color: COLORS.yellow,
    temperature: "Warm",
    className: "verdict-almost",
    bgClassName: "bg-verdict-almost",
    line: "You've nearly cooled down. One or two things first.",
  },
  BUILD_FIRST: {
    label: "BUILD FIRST",
    color: COLORS.amber,
    temperature: "Warm+",
    className: "verdict-build",
    bgClassName: "bg-verdict-build",
    line: "Build First is not failure. It is the map.",
  },
  NOT_YET: {
    label: "DO NOT PROCEED",
    color: COLORS.crimson,
    temperature: "Hot",
    className: "verdict-notyet",
    bgClassName: "bg-verdict-notyet",
    line: "Not yet is not no. It is clarity. It is protection.",
  },
};

export const PILLARS = [
  {
    key: "financial" as const,
    name: "Financial Reality",
    question: "Can you afford it?",
    color: COLORS.cyan,
    max: 35,
  },
  {
    key: "emotional" as const,
    name: "Emotional Truth",
    question: "Do you really want it?",
    color: COLORS.emerald,
    max: 35,
  },
  {
    key: "timing" as const,
    name: "Perfect Timing",
    question: "Is now the right moment?",
    color: COLORS.yellow,
    max: 30,
  },
];

export const LEGAL_DISCLAIMER =
  "HōMI is a product of HOMI TECHNOLOGIES LLC. HōMI is not a lender, mortgage broker, registered investment advisor, credit bureau, real estate agent or brokerage, financial planner, bank or deposit institution, or product recommendation engine. HōMI provides educational guidance only and does not provide financial, legal, tax, mortgage, real estate, or investment advice.";

export const TAGLINES = {
  primary: "Know When You're Ready",
  companion: "A Decision Companion",
  leap: "Know Before You Leap",
  moment: "The Moment Before Everything Changes",
  binary: "Ready or Not Yet. Nothing In Between.",
} as const;
