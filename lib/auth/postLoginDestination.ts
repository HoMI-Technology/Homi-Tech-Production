import { safeNext } from "@/lib/auth/safeNext";

/** Signed-in Home — build fold when a completed assessment exists. */
export const POST_LOGIN_HOME = "/dashboard" as const;

/** First measurement — start or resume the 45-q when no `next` and no build yet. */
export const POST_LOGIN_ASSESS = "/assessment" as const;

/**
 * State-based post-login landing (post-login audit F1 / phase 03).
 *
 * - Explicit `?next=` (including `/dashboard`) always wins after `safeNext`.
 *   Protected-route bounces use `next=/dashboard` and must return to Home.
 * - Missing `next` (fresh "Sign in" from marketing): route by assessment state —
 *   no completed assessment → `/assessment`; scored → `/dashboard`.
 */
export function resolvePostLoginDestination(args: {
  requestedNext: string | null | undefined;
  hasCompletedAssessment: boolean;
}): string {
  const raw = typeof args.requestedNext === "string" ? args.requestedNext.trim() : "";

  if (raw !== "") {
    return safeNext(raw, POST_LOGIN_HOME);
  }

  return args.hasCompletedAssessment ? POST_LOGIN_HOME : POST_LOGIN_ASSESS;
}
