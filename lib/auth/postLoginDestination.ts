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
 * Post-login landing.
 *
 * Default (production): `/` — `HOMI_V4_HOME_ENABLED` is unset/false.
 * When the flag is the exact string `"true"` *and* the V4 allow-list
 * includes `/home`, land on `/home`. Otherwise stay on `/`.
 *
 * Product `?next=` values (`/dashboard`, `/assessment`, role homes) are
 * ignored. The one KEEP exception is `/auth/reset-password`, so recovery
 * links still reach the reset form.
 *
 * Not a SaaS flag: one process env, no per-user experiments, no admin UI.
 */
export function resolvePostLoginDestination(args: PostLoginDestinationArgs): string {
  void args.hasCompletedAssessment;
  const sanitized = safeNext(args.requestedNext, POST_LOGIN_HOME);
  const pathOnly = normalizeAppPath((sanitized.split("?")[0] ?? sanitized) || "/");
  if (pathOnly === "/auth/reset-password") {
    return sanitized;
  }

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
