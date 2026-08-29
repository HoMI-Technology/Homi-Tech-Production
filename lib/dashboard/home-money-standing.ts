import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";

export type HomeMoneyStandingStatus = "empty" | "ready";

export type HomeMoneyStandingView = {
  status: HomeMoneyStandingStatus;
  runwayMonths: number | null;
  liquidDollars: number | null;
  hardStopFlags: string[];
  standingLine: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

export type HomeMoneyStandingInput = {
  lastMoney: LastReadMoneyInputs | null;
  hardStopFlags: string[];
  bankLinked: boolean | null;
};

function standingLine(args: {
  ready: boolean;
  runwayMonths: number | null;
  hardStopFlags: string[];
  bankLinked: boolean | null;
}): string {
  if (!args.ready) {
    return "No last read yet — assess so this strip can show Path evidence.";
  }
  if (args.hardStopFlags.length > 0) {
    return args.hardStopFlags[0] ?? "A hard stop is on this read.";
  }
  if (args.runwayMonths != null && Number.isFinite(args.runwayMonths)) {
    const months = args.runwayMonths >= 10 ? args.runwayMonths.toFixed(0) : args.runwayMonths.toFixed(1);
    return `Last read runway covers about ${months} months.`;
  }
  if (args.bankLinked === false) {
    return "Bank not linked — Path evidence here is the last assessment only.";
  }
  return "Path evidence from the last assessment — open Money for decide math.";
}

/**
 * View-model for the Home money standing strip.
 * Last AssessmentResult wins. No ledger surplus. No second FR score.
 */
export function buildHomeMoneyStandingView(input: HomeMoneyStandingInput | null): HomeMoneyStandingView {
  if (!input?.lastMoney) {
    return {
      status: "empty",
      runwayMonths: null,
      liquidDollars: null,
      hardStopFlags: [],
      standingLine: standingLine({
        ready: false,
        runwayMonths: null,
        hardStopFlags: [],
        bankLinked: input?.bankLinked ?? null,
      }),
      primaryHref: "/money/budget",
      primaryLabel: "Build your picture",
      secondaryHref: "/connections",
      secondaryLabel: "Connect bank",
    };
  }

  const runwayMonths = input.lastMoney.emergencyFundMonths;
  const liquidDollars = input.lastMoney.liquidDollars;
  const hardStopFlags = input.hardStopFlags;

  return {
    status: "ready",
    runwayMonths,
    liquidDollars,
    hardStopFlags,
    standingLine: standingLine({
      ready: true,
      runwayMonths,
      hardStopFlags,
      bankLinked: input.bankLinked,
    }),
    primaryHref: "/money",
    primaryLabel: "Open Money",
    secondaryHref: input.bankLinked ? "/money/decide" : "/connections",
    secondaryLabel: input.bankLinked ? "Decide" : "Connect bank",
  };
}
