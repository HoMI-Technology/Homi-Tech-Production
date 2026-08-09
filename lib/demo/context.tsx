"use client";

/**
 * Fixed mock dataset for the public /demo page. Fully decoupled from real
 * app state and Supabase — no network calls, no auth. Score 67 lands in the
 * ALMOST_THERE band (65-79, see lib/scoring/engine.ts THRESHOLD_ALMOST/
 * THRESHOLD_READY). Pillar points (24/23/20 against maxes 35/35/30) sum to
 * exactly 67, matching how the real engine derives overall_score as the sum
 * of pillar totals.
 */

import { createContext, useContext, useMemo } from "react";
import type { VerdictKey } from "@/lib/brand";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";
import type { DailyCheckin } from "@/types/database";

export interface DemoScoreHistoryPoint {
  score: number;
  verdict: VerdictKey;
  date: string;
}

export interface DemoJournalEntry {
  title: string;
  decision_type: string;
  context: string;
}

export interface DemoPillarBreakdown {
  financial: number;
  emotional: number;
  timing: number;
}

export interface DemoData {
  profileName: string;
  score: number;
  verdict: VerdictKey;
  scoreHistory: DemoScoreHistoryPoint[];
  pillars: DemoPillarBreakdown;
  pillarMax: DemoPillarBreakdown;
  journalEntries: DemoJournalEntry[];
  outcomeSurveyDue: boolean;
  streak: number;
  checkins: DailyCheckin[];
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const DEMO_DATA: DemoData = {
  profileName: "Alex Demo",
  score: 67,
  verdict: "ALMOST_THERE",
  scoreHistory: [
    { score: 61, verdict: "BUILD_FIRST", date: daysAgoIso(60) },
    { score: 64, verdict: "BUILD_FIRST", date: daysAgoIso(30) },
    { score: 67, verdict: "ALMOST_THERE", date: daysAgoIso(2) },
  ],
  pillars: {
    financial: 24,
    emotional: 23,
    timing: 20,
  },
  pillarMax: {
    financial: PILLAR_MAX_POINTS.financial,
    emotional: PILLAR_MAX_POINTS.emotional,
    timing: PILLAR_MAX_POINTS.timing,
  },
  journalEntries: [
    {
      title: "Considering an offer on the Maple St. condo",
      decision_type: "home_buying",
      context:
        "Two bedrooms, walkable to work. Weighing it against waiting another year to save more.",
    },
    {
      title: "Whether to take the relocation package",
      decision_type: "career",
      context:
        "New role in a lower cost-of-living city — would change the runway math significantly.",
    },
  ],
  outcomeSurveyDue: true,
  streak: 4,
  checkins: [6, 4, 3, 1].map((daysBack, i) => ({
    id: `demo-checkin-${i}`,
    user_id: "demo",
    mood: [6, 7, 7, 8][i],
    financial_stress: [6, 5, 5, 4][i],
    decision_pressure: [7, 6, 5, 5][i],
    note: null,
    created_at: daysAgoIso(daysBack),
  })),
};

const DemoContext = createContext<DemoData | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => DEMO_DATA, []);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

/** Reads the fixed demo dataset. Must be used within <DemoProvider>. */
export function useDemo(): DemoData {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemo() must be used within a <DemoProvider>.");
  }
  return ctx;
}
