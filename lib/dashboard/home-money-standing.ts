import { COLORS } from "@/lib/brand";
import {
  completenessLabel,
  PERIOD_SURPLUS_LABEL,
  type NamedMoneyMetrics,
} from "@/lib/finance/metrics";
import type { FinanceCompleteness } from "@/lib/finance/readiness-snapshot";
import { cashFlowTemperature, runwayTemperature, type Temperature } from "@/lib/finance/temperature";

const TEMP_COLOR: Record<Temperature, string> = {
  emerald: COLORS.emerald,
  yellow: COLORS.yellow,
  amber: COLORS.amber,
  crimson: COLORS.crimson,
};

const TEMP_WORD: Record<Temperature, string> = {
  emerald: "Steady",
  yellow: "Watch",
  amber: "Strain",
  crimson: "At risk",
};

export type HomeMoneyStandingStatus = "empty" | "ready";

export type HomeMoneyStandingView = {
  status: HomeMoneyStandingStatus;
  surplusDollars: number | null;
  runwayMonths: number | null;
  liquidDollars: number | null;
  chipLabel: string;
  chipColor: string;
  cashTempWord: string | null;
  cashTempColor: string;
  asOfLabel: string | null;
  liquidNote: string | null;
  standingLine: string;
  surplusLabel: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

/** Age label for the ledger `asOf` timestamp. */
export function moneyStandingAsOfLabel(asOf: string | null, nowMs: number = Date.now()): string | null {
  if (!asOf) return null;
  const days = Math.floor((nowMs - new Date(asOf).getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return "Age unknown";
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${days}d ago`;
}

function liquidNoteFrom(metrics: NamedMoneyMetrics): string | null {
  switch (metrics.evidence.liquidSource) {
    case "emergency_goal":
      return "Emergency goal balance";
    case "goal_proxy":
      return "Goal balance (proxy — not full liquid)";
    case "legacy_snapshot":
      return "Legacy snapshot";
    case "missing":
      return "Liquid not recorded";
    default: {
      const _exhaustive: never = metrics.evidence.liquidSource;
      void _exhaustive;
      return null;
    }
  }
}

function standingLine(args: {
  ready: boolean;
  completeness: FinanceCompleteness;
  cashTemp: Temperature | null;
  runwayMonths: number | null;
}): string {
  if (!args.ready) {
    return "No money picture yet — build Track or connect a bank so Home can show where cash sits.";
  }
  if (args.completeness === "low") {
    return "Draft picture — treat cash and runway as provisional until the ledger is stronger.";
  }
  const cash = args.cashTemp ? TEMP_WORD[args.cashTemp] : "Watch";
  if (args.runwayMonths != null && Number.isFinite(args.runwayMonths)) {
    const months = args.runwayMonths >= 10 ? args.runwayMonths.toFixed(0) : args.runwayMonths.toFixed(1);
    return `Cash flow is ${cash} · runway covers about ${months} months of outflow.`;
  }
  return `Cash flow is ${cash} · open Money for the full picture and decide math.`;
}

/**
 * View-model for the Home money standing strip — same ledger SoT as Money Stand.
 * Pass `null` metrics for empty / no picture yet.
 */
export function buildHomeMoneyStandingView(
  metrics: NamedMoneyMetrics | null,
  nowMs: number = Date.now(),
): HomeMoneyStandingView {
  if (!metrics) {
    return {
      status: "empty",
      surplusDollars: null,
      runwayMonths: null,
      liquidDollars: null,
      chipLabel: "No picture yet",
      chipColor: COLORS.dim,
      cashTempWord: null,
      cashTempColor: COLORS.cyan,
      asOfLabel: null,
      liquidNote: null,
      standingLine: standingLine({
        ready: false,
        completeness: "low",
        cashTemp: null,
        runwayMonths: null,
      }),
      surplusLabel: PERIOD_SURPLUS_LABEL,
      primaryHref: "/money/budget",
      primaryLabel: "Build your picture",
      secondaryHref: "/connections",
      secondaryLabel: "Connect bank",
    };
  }

  const surplus = metrics.surplus.dollars;
  const income = metrics.surplus.incomeDollars;
  const runwayMonths = metrics.runway.months;
  const liquid = metrics.runway.liquidDollars;
  const completeness = metrics.evidence.completeness;
  const cashTemp = cashFlowTemperature(surplus, income);
  const runwayTemp =
    runwayMonths != null ? runwayTemperature(runwayMonths) : ("amber" as Temperature);

  void runwayTemp;

  return {
    status: "ready",
    surplusDollars: surplus,
    runwayMonths,
    liquidDollars: liquid,
    chipLabel: completenessLabel(completeness),
    chipColor:
      completeness === "high"
        ? COLORS.emerald
        : completeness === "medium"
          ? COLORS.yellow
          : COLORS.amber,
    cashTempWord: TEMP_WORD[cashTemp],
    cashTempColor: TEMP_COLOR[cashTemp],
    asOfLabel: moneyStandingAsOfLabel(metrics.asOf, nowMs) ?? "Age unknown",
    liquidNote: liquidNoteFrom(metrics),
    standingLine: standingLine({
      ready: true,
      completeness,
      cashTemp,
      runwayMonths,
    }),
    surplusLabel: PERIOD_SURPLUS_LABEL,
    primaryHref: completeness === "low" ? "/money/budget" : "/money",
    primaryLabel: completeness === "low" ? "Strengthen picture" : "Open Money",
    secondaryHref: "/money/decide",
    secondaryLabel: "Decide",
  };
}
