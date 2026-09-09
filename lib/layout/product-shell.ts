/**
 * Chrome branch for the (product) group.
 *
 * PIXEL FAIL on 0730cfd stills showed PR11 rail labels (Assess · Plan · Money).
 * That is guest/quiet chrome or a stale PR11 bundle — not LEFT_RAIL_PRIMARY.
 * PR13 locks signed-in personal Home to the invent rail: never SiteHeader,
 * never the role-tree quiet AppHeader, never ProductBottomNav.
 */

import { isV4HomeEnabled, isV4RouteActivated } from "@/lib/auth/keep-routes";
import { isRoleOperateRoute } from "@/lib/layout/left-rail";

export const PRODUCT_SHELLS = ["guest", "role", "personal", "v4"] as const;
export type ProductShell = (typeof PRODUCT_SHELLS)[number];

/**
 * Optional request header (middleware or host). Layout also accepts
 * x-invoke-path / x-matched-path when the host forwards them.
 */
export const PRODUCT_SHELL_PATH_HEADER = "x-homi-pathname" as const;

export function pathnameFromRequestHeaders(headerList: Headers): string {
  const raw =
    headerList.get(PRODUCT_SHELL_PATH_HEADER) ??
    headerList.get("x-invoke-path") ??
    headerList.get("x-matched-path") ??
    "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) {
    const q = trimmed.indexOf("?");
    return q === -1 ? trimmed : trimmed.slice(0, q);
  }
  try {
    return new URL(trimmed).pathname;
  } catch {
    return "";
  }
}

/**
 * Named packet: signed-in `/dashboard` is always personal invent chrome.
 * Missing pathname + authenticated fails open to personal (Home), not guest.
 * Role trees still win when the path is an operate prefix.
 */
export function productShellFor(
  pathname: string | null | undefined,
  hasUser: boolean,
): ProductShell {
  if (isV4HomeEnabled() && hasUser && (!pathname || isV4RouteActivated(pathname))) {
    return "v4";
  }
  if (!hasUser) return "guest";
  if (isRoleOperateRoute(pathname)) return "role";
  return "personal";
}

export function resolveProductShell(
  serverShell: ProductShell,
  pathname: string | null | undefined,
  hasUser: boolean,
): ProductShell {
  const live = productShellFor(pathname, hasUser);
  if (live === "v4" || serverShell === "v4") return "v4";
  if (live === "role") return "role";
  if (live === "guest" || !hasUser) return "guest";
  if (serverShell === "role" && !pathname) return "role";
  return "personal";
}
