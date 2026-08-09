/**
 * HōMI Notifications Rules
 * =========================
 *
 * Derives a short list of notification items from pre-fetched data. Pure
 * function — no Supabase/localStorage calls here. Callers (NotificationBell)
 * fetch/read data and pass it in. Mirrors the style of lib/signals/engine.ts.
 */

import type { StoredAssessment } from "@/lib/assessment/storage";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  href: string;
  /** ISO timestamp, used for sorting/dedup/read-state comparison. Can be "now" for computed ones. */
  createdAt: string;
}

export interface DeriveNotificationsInput {
  /** The user's last stored/server assessment, or null if signed out or never taken. */
  storedAssessment: StoredAssessment | null;
  /** True when a due, incomplete outcome_surveys row exists for this user. */
  dueSurvey: boolean;
  /** ISO created_at of the most recent daily_checkins row, or null if signed out or none exist. */
  lastCheckinDate: string | null;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Rule 1 — a due outcome survey is ready. */
function dueOutcomeSurveyNotification(dueSurvey: boolean): NotificationItem | null {
  if (!dueSurvey) return null;
  return {
    id: "due-outcome-survey",
    title: "An outcome survey is ready",
    body: "A quick check-in on how things went since your last decision. No judgment either way — just an honest read.",
    href: "/dashboard",
    createdAt: new Date().toISOString(),
  };
}

/** Rule 2 — the stored assessment is more than 30 days old. Mirrors staleAssessmentSignal in lib/signals/engine.ts. */
function staleAssessmentNotification(
  storedAssessment: StoredAssessment | null,
): NotificationItem | null {
  if (!storedAssessment) return null;
  const completedAt = new Date(storedAssessment.completedAt).getTime();
  if (Number.isNaN(completedAt)) return null;
  if (Date.now() - completedAt > THIRTY_DAYS_MS) {
    return {
      id: "stale-assessment",
      title: "Time for a fresh read",
      body: "Your last assessment is more than 30 days old. A quick retake keeps your plan honest.",
      href: "/assessment",
      createdAt: new Date(completedAt).toISOString(),
    };
  }
  return null;
}

/** Rule 3 — a light, protective nudge when there's an active daily check-in streak. Not naggy. */
function streakEncouragementNotification(lastCheckinDate: string | null): NotificationItem | null {
  if (!lastCheckinDate) return null;
  const last = new Date(lastCheckinDate).getTime();
  if (Number.isNaN(last)) return null;
  if (Date.now() - last <= ONE_DAY_MS) {
    return {
      id: "streak-encouragement",
      title: "Your streak is holding",
      body: "You've been showing up for your daily check-ins. No pressure to keep it perfect — just keep it honest.",
      href: "/daily",
      createdAt: new Date().toISOString(),
    };
  }
  return null;
}

/** Rule 4 — a pointer back to a READY result. */
function readyCelebrationNotification(
  storedAssessment: StoredAssessment | null,
): NotificationItem | null {
  if (!storedAssessment) return null;
  if (storedAssessment.result.verdict !== "READY") return null;
  return {
    id: "ready-celebration",
    title: "Your compass is ready",
    body: "All three rings align. Take a look at your full result whenever you're ready.",
    href: "/results",
    createdAt: storedAssessment.completedAt,
  };
}

/** Combines all rules into one list, newest first. */
export function deriveNotifications(input: DeriveNotificationsInput): NotificationItem[] {
  const items: NotificationItem[] = [];

  const dueOutcome = dueOutcomeSurveyNotification(input.dueSurvey);
  if (dueOutcome) items.push(dueOutcome);

  const stale = staleAssessmentNotification(input.storedAssessment);
  if (stale) items.push(stale);

  const streak = streakEncouragementNotification(input.lastCheckinDate);
  if (streak) items.push(streak);

  const ready = readyCelebrationNotification(input.storedAssessment);
  if (ready) items.push(ready);

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
