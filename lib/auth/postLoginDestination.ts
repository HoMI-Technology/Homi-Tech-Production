import { safeNext } from "@/lib/auth/safeNext";
import { normalizeAppPath } from "@/lib/auth/keep-routes";

/** After sign-in / OAuth callback — the landing page (PR15). */
export const POST_LOGIN_HOME = "/" as const;

/**
 * Retired first-measurement default. PR15 scratches `/assessment`; the
 * export stays so older call sites compile, and it is the same `/` as home.
 */
export const POST_LOGIN_ASSESS = "/" as const;

/**
 * Post-login landing is `/`.
 *
 * Product `?next=` values (`/dashboard`, `/assessment`, role homes) are
 * ignored. The one KEEP exception is `/auth/reset-password`, so recovery
 * links still reach the reset form.
 */
export function resolvePostLoginDestination(args: {
  requestedNext: string | null | undefined;
  hasCompletedAssessment: boolean;
}): string {
  void args.hasCompletedAssessment;
  const sanitized = safeNext(args.requestedNext, POST_LOGIN_HOME);
  const pathOnly = normalizeAppPath((sanitized.split("?")[0] ?? sanitized) || "/");
  if (pathOnly === "/auth/reset-password") {
    return sanitized;
  }
  return POST_LOGIN_HOME;
}
