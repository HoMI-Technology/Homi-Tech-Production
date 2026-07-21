/**
 * HōMI Brand Core — locked to CANON.md + homi-tokens.json.
 * These values are immutable for production. Never approximate.
 */

export const BRAND = {
  name: "HōMI",
  display: "HōMI",
  legalEntity: "HOMI TECHNOLOGIES LLC",
  domain: "homitechnology.com",
  category: "Decision Readiness Intelligence™",
} as const;

export const COLORS = {
  cyan: "#22d3ee",
  emerald: "#34d399",
  yellow: "#facc15",
  amber: "#fab633",
  crimson: "#f24822",
  navy: "#0a1628",
  navyLight: "#0f172a",
  slate: "#1e293b",
  light: "#e2e8f0",
  dim: "#94a3b8",
} as const;

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
