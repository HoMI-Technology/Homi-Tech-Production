/**
 * Lens Registry — Decision Lab Phase 1.
 *
 * The single declarative contract for every decision tool. Before this,
 * tool metadata lived in two places (the hub's hardcoded GROUPS array and
 * each page's own copy) and tool inputs lived nowhere — each page invented
 * its own slider defaults. The registry drives four things from one
 * definition:
 *
 *   1. The /tools hub (ring grouping, cards, counts)
 *   2. CFM prefill (inputs[].cfmPath → slider seed + "your numbers" tag)
 *   3. Decision chains (typed next-lens hand-offs on result panels)
 *   4. The Companion's lens digest (Phase 3 — ids, paths, coverage paths)
 *
 * Pure data + types only. No storage, no React — safe to import anywhere.
 */

export type LensRing = "readiness" | "reality" | "stability" | "timing";

export interface RingMeta {
  title: string;
  subtitle: string;
  /** Canonical brand accent for the ring. */
  accent: string;
}

export const RING_META: Record<LensRing, RingMeta> = {
  readiness: {
    title: "Readiness",
    subtitle: "Same engine as the assessment — explore levers without a full retest.",
    accent: "#22d3ee",
  },
  reality: {
    title: "Financial Reality",
    subtitle: "What you can carry — not just what a lender will approve.",
    accent: "#22d3ee",
  },
  stability: {
    title: "Stability",
    subtitle: "Shock absorption before the leap.",
    accent: "#34d399",
  },
  timing: {
    title: "Perfect Timing",
    subtitle: "Independence and path risk — educational, not advice.",
    accent: "#facc15",
  },
};

export const RING_ORDER: LensRing[] = ["readiness", "reality", "stability", "timing"];

export interface LensInputSpec {
  key: string;
  label: string;
  /** Dot path into the CFM ("housing.targetPrice"). When set and the CFM
   * has a real value, the slider seeds from it and renders a "your
   * numbers" tag. When absent, the illustrative fallback is used — and
   * never presented as the user's. */
  cfmPath?: string;
  /** CFM path written back when the user hits "update my numbers". */
  writeBack?: string;
  fallback: number;
  min: number;
  max: number;
  step: number;
  format: "currency" | "percent" | "years";
}

export interface LensChain {
  lensId: string;
  /** Why this hand-off matters, in product voice. */
  pitch: string;
  /** Input keys carried into the next lens's prefill. */
  carry: string[];
}

export interface LensDefinition {
  id: string;
  path: string;
  name: string;
  desc: string;
  ring: LensRing;
  accent: string;
  gate: "free" | "plus";
  /** Full input contract. Lenses not yet refactored omit this and keep
   * their current self-contained pages — adoption is incremental. */
  inputs?: LensInputSpec[];
  chains?: LensChain[];
}

export const LENSES: LensDefinition[] = [
  // --- Readiness ---
  {
    id: "simulator",
    path: "/simulator",
    name: "Score Simulator",
    desc: "Move income, savings, and debt levers and watch readiness respond.",
    ring: "readiness",
    accent: "#22d3ee",
    gate: "free",
  },

  // --- Financial Reality (housing) ---
  {
    id: "affordability",
    path: "/tools/affordability",
    name: "Affordability",
    desc: "Three honest comfort tiers — protected, stretch, and red line.",
    ring: "reality",
    accent: "#34d399",
    gate: "plus",
    chains: [
      {
        lensId: "mortgage",
        pitch: "See a real payment at this price",
        carry: ["price"],
      },
      {
        lensId: "down-payment",
        pitch: "How long the down payment actually takes",
        carry: ["price"],
      },
    ],
  },
  {
    id: "mortgage",
    path: "/tools/mortgage",
    name: "Mortgage Payment",
    desc: "Full monthly payment parts plus true cost over the life of the loan.",
    ring: "reality",
    accent: "#22d3ee",
    gate: "plus",
    inputs: [
      {
        key: "price",
        label: "Home price",
        cfmPath: "housing.targetPrice",
        writeBack: "targetPrice",
        fallback: 400000,
        min: 100000,
        max: 1500000,
        step: 5000,
        format: "currency",
      },
      {
        key: "downPayment",
        label: "Down payment",
        cfmPath: "housing.downPaymentSaved",
        writeBack: "downPaymentSaved",
        fallback: 80000,
        min: 0,
        max: 1500000,
        step: 1000,
        format: "currency",
      },
      {
        key: "rate",
        label: "Interest rate",
        cfmPath: "housing.assumedRatePct",
        writeBack: "assumedRatePct",
        fallback: 6.5,
        min: 2,
        max: 12,
        step: 0.125,
        format: "percent",
      },
      {
        key: "termYears",
        label: "Loan term (years)",
        cfmPath: "housing.termYears",
        writeBack: "termYears",
        fallback: 30,
        min: 10,
        max: 30,
        step: 5,
        format: "years",
      },
      {
        key: "taxInsRate",
        label: "Taxes + insurance (% of price / yr)",
        cfmPath: "housing.taxInsuranceRatePct",
        writeBack: "taxInsuranceRatePct",
        fallback: 1.5,
        min: 0.5,
        max: 3,
        step: 0.1,
        format: "percent",
      },
      {
        key: "hoaMonthly",
        label: "HOA (monthly)",
        cfmPath: "housing.hoaMonthly",
        writeBack: "hoaMonthly",
        fallback: 0,
        min: 0,
        max: 1500,
        step: 25,
        format: "currency",
      },
    ],
    chains: [
      {
        lensId: "rent-vs-buy",
        pitch: "Compare buying at this price against staying put",
        carry: ["price", "rate", "termYears", "hoaMonthly"],
      },
      {
        lensId: "affordability",
        pitch: "Check this payment against your comfort tiers",
        carry: ["price"],
      },
    ],
  },
  {
    id: "rent-vs-buy",
    path: "/tools/rent-vs-buy",
    name: "Rent vs. Buy",
    desc: "Five-year cost comparison where timing matters as much as math.",
    ring: "reality",
    accent: "#facc15",
    gate: "plus",
    chains: [
      {
        lensId: "down-payment",
        pitch: "Map the savings path to get there",
        carry: ["price"],
      },
    ],
  },
  {
    id: "down-payment",
    path: "/tools/down-payment",
    name: "Down Payment Goal",
    desc: "How long it really takes at your actual savings rate.",
    ring: "reality",
    accent: "#22d3ee",
    gate: "plus",
    chains: [
      {
        lensId: "simulator",
        pitch: "See what reaching this goal does to readiness",
        carry: [],
      },
    ],
  },
  {
    id: "heloc",
    path: "/tools/heloc",
    name: "Home Equity Line",
    desc: "Borrowable equity after combined loan-to-value caps — not paper equity.",
    ring: "reality",
    accent: "#34d399",
    gate: "plus",
  },
  {
    id: "refinance",
    path: "/tools/refinance",
    name: "Refinance Break-Even",
    desc: "When payment savings repay closing costs — and if you’ll still be there.",
    ring: "reality",
    accent: "#facc15",
    gate: "plus",
  },
  {
    id: "apr-compare",
    path: "/tools/apr-compare",
    name: "APR Comparison",
    desc: "Three offers ranked by cost-inclusive APR, not just the teaser rate.",
    ring: "reality",
    accent: "#22d3ee",
    gate: "plus",
  },
  {
    id: "loan-programs",
    path: "/tools/loan-programs",
    name: "Loan Programs",
    desc: "Conventional vs FHA vs VA after down payment, MI, and upfront fees.",
    ring: "reality",
    accent: "#34d399",
    gate: "plus",
  },

  // --- Stability ---
  {
    id: "runway",
    path: "/tools/runway",
    name: "Emergency Runway",
    desc: "Months of essentials your liquid savings actually cover.",
    ring: "stability",
    accent: "#34d399",
    gate: "free",
    chains: [
      {
        lensId: "debt-payoff",
        pitch: "Free up outflow by killing a balance",
        carry: [],
      },
    ],
  },
  {
    id: "debt-payoff",
    path: "/tools/debt-payoff",
    name: "Debt Payoff",
    desc: "Avalanche vs snowball side by side — interest cost, not slogans.",
    ring: "stability",
    accent: "#fb923c",
    gate: "plus",
    chains: [
      {
        lensId: "runway",
        pitch: "Watch runway grow as payments disappear",
        carry: [],
      },
    ],
  },
  {
    id: "blind-budget",
    path: "/tools/blind-budget",
    name: "Blind Budget",
    desc: "Plan honestly when exact numbers aren’t available yet.",
    ring: "stability",
    accent: "#facc15",
    gate: "plus",
  },

  // --- Perfect Timing (long horizon) ---
  {
    id: "fire",
    path: "/tools/fire",
    name: "FIRE Number",
    desc: "What you’d need invested to live on withdrawals — and coast progress.",
    ring: "timing",
    accent: "#34d399",
    gate: "plus",
  },
  {
    id: "monte-carlo",
    path: "/tools/monte-carlo",
    name: "Monte Carlo Projection",
    desc: "1,000 simulated futures — markets don’t move in a straight line.",
    ring: "timing",
    accent: "#22d3ee",
    gate: "plus",
  },
  {
    id: "roth-conversion",
    path: "/tools/roth-conversion",
    name: "Roth Conversion",
    desc: "Tax cost today versus tax avoided later. Not a recommendation.",
    ring: "timing",
    accent: "#facc15",
    gate: "plus",
  },
];

export function getLens(id: string): LensDefinition | undefined {
  return LENSES.find((l) => l.id === id);
}

export function lensesByRing(ring: LensRing): LensDefinition[] {
  return LENSES.filter((l) => l.ring === ring);
}

/** All CFM paths a lens can seed from — the Companion's coverage input. */
export function lensCoveragePaths(lens: LensDefinition): string[] {
  return (lens.inputs ?? [])
    .map((i) => i.cfmPath)
    .filter((p): p is string => typeof p === "string");
}
