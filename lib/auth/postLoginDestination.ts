import { safeNext } from "@/lib/auth/safeNext";
import type { UserRole } from "@/types/database";

/** Signed-in Home — build fold when a completed assessment exists. */
export const POST_LOGIN_HOME = "/dashboard" as const;

/** First measurement — start or resume the 45-q when no `next` and no build yet. */
export const POST_LOGIN_ASSESS = "/assessment" as const;

/** Orientation — shown once, to an account that has never scored. */
export const POST_LOGIN_ONBOARDING = "/onboarding" as const;

/** A partner's home is their book, not their own readiness. */
export const POST_LOGIN_PARTNER = "/partner/dashboard" as const;

/** Benefit context for an employer-linked account, shown once per device. */
export const POST_LOGIN_EMPLOYEE = "/employee/dashboard" as const;

/** Verdicts older than this are stale — surfaced as "as of {date}" on the fold. */
export const STALE_VERDICT_DAYS = 30;

/**
 * Per-device marker that the employee benefit orientation has been shown.
 * A cookie rather than a `profiles` column: a one-time UI nicety is not worth
 * a migration, and showing benefit context once on each device the person
 * actually uses is defensible on its own.
 *
 * Deliberately NOT httpOnly — the password sign-in path resolves the landing
 * in the browser and has to read it. It carries no secret: it says only that
 * an orientation screen has been shown once.
 */
export const EMPLOYEE_HOME_SEEN_COOKIE = "homi_employee_home_seen";

export const EMPLOYEE_HOME_SEEN_MAX_AGE = 60 * 60 * 24 * 365;

/** The marker as a `document.cookie` assignment (client-side burn). */
export function employeeHomeSeenCookieValue(): string {
  return `${EMPLOYEE_HOME_SEEN_COOKIE}=1; path=/; max-age=${EMPLOYEE_HOME_SEEN_MAX_AGE}; samesite=lax`;
}

/** Whole days between `scoredAt` and `now`. Null/unparseable reads as fresh. */
export function verdictAgeDays(scoredAt: string | null | undefined, now: Date): number | null {
  if (!scoredAt) return null;
  const then = new Date(scoredAt).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.floor((now.getTime() - then) / (1000 * 60 * 60 * 24));
}

export interface PostLoginSignals {
  requestedNext: string | null | undefined;
  hasCompletedAssessment: boolean;
  /**
   * Everything below is optional. A caller that does not know a signal simply
   * cannot trigger that state, and the function degrades to the original
   * two-state behaviour — which is what keeps existing call sites correct.
   */
  role?: UserRole | null;
  employerId?: string | null;
  onboardingCompleted?: boolean;
  employeeHomeSeen?: boolean;
  /** Hard stops on the latest completed assessment. */
  hardStopCount?: number;
  /** `completed_at ?? created_at` of the latest completed assessment. */
  scoredAt?: string | null;
  now?: Date;
}

/**
 * State-based post-login landing (post-login audit F1 / phase 03, extended by
 * docs/design/post-login-home-direction.md §2).
 *
 * - Explicit `?next=` (including `/dashboard`) always wins after `safeNext`.
 *   Protected-route bounces use `next=/dashboard` and must return to Home.
 * - Missing `next` (fresh "Sign in" from marketing): route by role and state.
 *
 * ## Precedence
 *
 * Order is deliberate and does not follow the design doc's state numbering,
 * because that table numbers states rather than ranking them:
 *
 * 1. **Orientation (S1)** outranks everything — someone who has never scored
 *    should learn what HōMI is before being handed a workspace, whatever their
 *    role. Gated on "has never scored" as well as `onboarding_completed`, so a
 *    First Moment signup who assessed *before* creating the account is never
 *    sent back to an intro they have already outgrown.
 * 2. **Role** (S7 partner, S8 employee) outranks personal assessment state —
 *    a partner's home is their book. The doc hedges this as "(and not
 *    personal-first)"; this is that hedge, resolved.
 * 3. **Personal state** (S3 unscored, then S5/S6/S4) for everyone else.
 *
 * ## Not represented here, on purpose
 *
 * - **S2 (draft in progress)** needs no branch: an unscored account already
 *   routes to `/assessment`, which resumes an in-progress draft by itself.
 * - **S9 (admin) and S10 (org member)** are non-routing by design — "admin is
 *   a workspace, not a home", and a team view is aggregate-only and never a
 *   landing. Both fall through to the personal states and reach their
 *   workspace through the switcher.
 *
 * S5 and S6 share `/dashboard` with S4. They are distinguished so the fold can
 * lead with a hard stop, or mark a stale verdict, rather than opening on a
 * number that is not the most important thing on the screen.
 */
export function resolvePostLoginDestination(args: PostLoginSignals): string {
  const raw = typeof args.requestedNext === "string" ? args.requestedNext.trim() : "";

  if (raw !== "") {
    return safeNext(raw, POST_LOGIN_HOME);
  }

  // S1 — orientation, once, and only for someone who has never scored.
  if (args.onboardingCompleted === false && !args.hasCompletedAssessment) {
    return POST_LOGIN_ONBOARDING;
  }

  // S7 — a partner's home is their book, not their own readiness.
  if (args.role === "partner") {
    return POST_LOGIN_PARTNER;
  }

  // S8 — benefit context once, then the personal home from then on.
  if (args.employerId && !args.employeeHomeSeen) {
    return POST_LOGIN_EMPLOYEE;
  }

  // S3 — nothing measured yet. /assessment also resumes a draft, which is why
  // "draft in progress" needs no state of its own.
  if (!args.hasCompletedAssessment) {
    return POST_LOGIN_ASSESS;
  }

  // S5 / S6 / S4 — all Home; the fold decides what leads.
  return POST_LOGIN_HOME;
}

export type PostLoginState = "S1" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "explicit";

/**
 * The same decision, reported as a state rather than a path.
 *
 * `resolvePostLoginDestination` answers "where do they go"; this answers "why",
 * which is what a fold needs in order to lead with a hard stop (S5) or mark a
 * stale verdict (S6) instead of opening on the score. Kept as a separate export
 * so the routing signature stays exactly as upstream defined it.
 */
export function resolvePostLoginState(args: PostLoginSignals): PostLoginState {
  const raw = typeof args.requestedNext === "string" ? args.requestedNext.trim() : "";
  if (raw !== "") return "explicit";

  if (args.onboardingCompleted === false && !args.hasCompletedAssessment) return "S1";
  if (args.role === "partner") return "S7";
  if (args.employerId && !args.employeeHomeSeen) return "S8";
  if (!args.hasCompletedAssessment) return "S3";
  if ((args.hardStopCount ?? 0) > 0) return "S5";

  const ageDays = verdictAgeDays(args.scoredAt, args.now ?? new Date());
  if (ageDays !== null && ageDays > STALE_VERDICT_DAYS) return "S6";

  return "S4";
}
