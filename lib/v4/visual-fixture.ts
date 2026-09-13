/**
 * Home v4 visual fixtures — operator stills only.
 * AssessmentResult-shaped. No second score. No invented $.
 */

import {
  foldPathPrimary,
  hardStopCodes,
  hardStopMessages,
  leadingFoldHardStopCode,
  type FoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import type { VerdictKey } from "@/lib/brand";
import type { HomeV4Reading } from "@/lib/v4/home-state";

export const V4_VISUAL_STATES = [
  "hard-stop",
  "empty",
  "money-disconnected",
  "normal",
] as const;

export type V4VisualState = (typeof V4_VISUAL_STATES)[number];

export function parseV4VisualState(raw: string | null | undefined): V4VisualState | null {
  if (!raw) return null;
  return (V4_VISUAL_STATES as readonly string[]).includes(raw) ? (raw as V4VisualState) : null;
}

/** Operator stills only. Never a public unlock; still requires HOMI_V4_HOME_ENABLED. */
export function isV4VisualFixtureEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.HOMI_V4_VISUAL_FIXTURE === "true";
}

const HARD_STOPS = [
  {
    code: "RUNWAY_UNDER_1_MONTH" satisfies FoldHardStopCode,
    message: "You have less than one month of expenses set aside.",
  },
];

const STATE_A_PATH_STEPS = [
  {
    title: "Stabilize emergency runway to at least 1 month",
    href: "/path",
    status: "pending",
    reasonCode: "RUNWAY_UNDER_1_MONTH",
  },
  { title: "Name the monthly number that is actually leaving.", href: "/path", status: "pending" },
  { title: "Hold new housing search until runway clears.", href: "/path", status: "pending" },
];

function lastMoneyEmpty(): LastReadMoneyInputs {
  return {
    debtToIncomeRatio: null,
    emergencyFundMonths: 0.4,
    savingsRate: null,
    liquidDollars: null,
  };
}

function fromStops(hardStops: typeof HARD_STOPS): Pick<
  HomeV4Reading,
  "stopMessages" | "stopCode" | "stopCodes"
> {
  return {
    stopMessages: hardStopMessages(hardStops),
    stopCodes: hardStopCodes(hardStops),
    stopCode: leadingFoldHardStopCode(hardStopCodes(hardStops)),
  };
}

export function homeV4VisualReading(state: V4VisualState): HomeV4Reading | null {
  switch (state) {
    case "empty":
      return null;
    case "hard-stop":
    case "money-disconnected": {
      const pathSteps = STATE_A_PATH_STEPS;
      return {
        overallScore: 61,
        scoredAt: "2026-08-29T12:00:00.000Z",
        financialScore: 18,
        emotionalScore: 22,
        timingScore: 21,
        verdict: "NOT_YET" satisfies VerdictKey,
        decisionType: "home_buying",
        lastMoney: lastMoneyEmpty(),
        pathPrimary: foldPathPrimary(pathSteps),
        pathSteps,
        moneyConnected: false,
        ...fromStops(HARD_STOPS),
      };
    }
    case "normal": {
      const pathSteps = [
        { title: "Keep the runway above one month.", href: "/path", status: "pending" },
        { title: "Re-check the read after the next pay cycle.", href: "/path", status: "pending" },
      ];
      return {
        overallScore: 72,
        scoredAt: "2026-08-29T12:00:00.000Z",
        financialScore: 24,
        emotionalScore: 26,
        timingScore: 22,
        verdict: "ALMOST_THERE" satisfies VerdictKey,
        decisionType: "home_buying",
        lastMoney: {
          debtToIncomeRatio: 0.32,
          emergencyFundMonths: 2.1,
          savingsRate: 0.12,
          liquidDollars: null,
        },
        pathPrimary: foldPathPrimary(pathSteps),
        pathSteps,
        moneyConnected: false,
        stopMessages: [],
        stopCodes: [],
        stopCode: null,
      };
    }
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
