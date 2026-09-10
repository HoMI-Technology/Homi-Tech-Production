import { safeNext } from "@/lib/auth/safeNext";
import {
  isV4HomeEnabled,
  isV4RouteActivated,
  normalizeAppPath,
  v4AllowList,
} from "@/lib/auth/keep-routes";

/** After sign-in / OAuth callback — landing while V4 Home is off (PR15 / CCP default). */
export const POST_LOGIN_HOME = "/" as const;

/** Contract route for signed-in Home v4. Activated only by flag + allow-list. */
export const POST_LOGIN_V4_HOME = "/home" as const;

/**
 * Retired first-measurement default. PR15 scratches `/assessment`; the
 * export stays so older call sites compile, and it is the same `/` as home.
 */
export const POST_LOGIN_ASSESS = "/" as const;

export type PostLoginDestinationArgs = {
  requestedNext: string | null | undefined;
  hasCompletedAssessment: boolean;
  /** Test/override. Defaults to `HOMI_V4_HOME_ENABLED === "true"`. */
  v4HomeEnabled?: boolean;
  /** Test/override. Defaults to V4_PENDING ∪ V4_LIVE. */
  v4AllowList?: readonly string[];
};

/**
 * KEEP exception shared by server and client landing.
 * Product `?next=` (`/dashboard`, `/assessment`, role homes) is ignored.
 */
function keepResetPasswordNext(requestedNext: string | null | undefined): string | null {
  const sanitized = safeNext(requestedNext, POST_LOGIN_HOME);
  const pathOnly = normalizeAppPath((sanitized.split("?")[0] ?? sanitized) || "/");
  return pathOnly === "/auth/reset-password" ? sanitized : null;
}

/**
 * Server-only post-login landing (callback / RSC).
 *
 * Reads `HOMI_V4_HOME_ENABLED`, which is **not** `NEXT_PUBLIC_*`. Never call
 * this from a client component — the browser always sees the flag as unset
 * and lands on `/` (founder login loop after Home v4). Use
 * `clientPostLoginDestination` on password sign-in / sign-up instead.
 *
 * Default (flag off): `/`. Flag exact `"true"` *and* `/home` on the V4
 * allow-list: `/home`. Not a SaaS flag: one process env, no per-user
 * experiments, no admin UI.
 */
export function resolvePostLoginDestination(args: PostLoginDestinationArgs): string {
  void args.hasCompletedAssessment;
  const reset = keepResetPasswordNext(args.requestedNext);
  if (reset) return reset;

  const enabled = args.v4HomeEnabled ?? isV4HomeEnabled();
  const allowList = args.v4AllowList ?? v4AllowList();
  if (
    isV4RouteActivated(POST_LOGIN_V4_HOME, {
      v4HomeEnabled: enabled,
      allowList,
    })
  ) {
    return POST_LOGIN_V4_HOME;
  }
  return POST_LOGIN_HOME;
}

/**
 * Password / client-side sign-in landing.
 *
 * Always send `/home` (or the reset-password KEEP next). Do not read
 * `HOMI_V4_HOME_ENABLED` here — it is server-only, so `isV4HomeEnabled()`
 * is always false in the browser. `app/(product)/home/page.tsx` still
 * redirects to `/` when the flag is off.
 */
export function clientPostLoginDestination(
  requestedNext: string | null | undefined,
): string {
  return keepResetPasswordNext(requestedNext) ?? POST_LOGIN_V4_HOME;
}
