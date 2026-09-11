/**
 * PR15 KEEP/KILL surface map, extended by CCP v1 (Change Control Plane).
 *
 * Four lanes — KEEP · DARK · V4_PENDING · V4_LIVE — are documented in
 * `docs/CHANGE_CONTROL_V1.md`. This module is the executable allow-list.
 *
 * Dark product pages (redirect → `/`) and product APIs (JSON 404). Do not
 * delete or migrate away Supabase schema/RLS/data, auth users, Plaid rows,
 * Stripe, or integration config. Score/finance/product code stays on disk
 * for an easy rebuild; it is just unreachable from routes/APIs.
 *
 * Middleware uses this module as the only allow-list: KEEP pages pass
 * through, extra legal folds to `/legal/privacy`, KEEP APIs stay live,
 * unpublished V4 paths fold to `/`, and every other `/api/*` returns JSON 404.
 *
 * Do not restyle KEEP pages. Do not invent replacement product chrome.
 */

export type ChangeControlLane = "KEEP" | "DARK" | "V4_PENDING" | "V4_LIVE";

const KEEP_PAGES = new Set(["/", "/waitlist", "/legal/privacy", "/legal/terms", "/legal/cookies"]);

const KEEP_API_PREFIXES = ["/api/waitlist", "/api/healthcheck", "/api/csp-report"] as const;

/**
 * CCP v1 V4_PENDING hosts. `/home` is the signed-in Home contract (preferred
 * over resurrecting `/dashboard` UX). PR C names Shell v4 workspaces
 * (Home · Money · Path · Compare, then Bills · Tools · Learn and
 * Accounts · Settings). `/money/bills` is covered by the `/money` prefix
 * (see `matchesListedPath`). PR K adds `/employee` so `/employee/dashboard`
 * and depth activate under the same flag. PR K2 adds `/partner` so
 * `/partner/dashboard` + depth activate under the same flag. `/dashboard`
 * stays DARK. Do not add `/admin` `/team` this pass (K3–K4). Do not add
 * `/first-moment` — guest invite is not a role home.
 */
export const V4_PENDING_PATHS = [
  "/home",
  "/money",
  "/path",
  "/scenarios",
  "/ask",
  "/tools",
  "/learn",
  "/settings",
  "/connections",
  "/assessment",
  "/employee",
  "/partner",
] as const;

/**
 * CCP v1 V4_LIVE hosts. Empty until Home v4 ships. Moving a path here is a
 * deliberate activation, not an implicit side-effect of the env flag.
 */
export const V4_LIVE_PATHS: readonly string[] = [];

/** Server-only env. Exact lowercase `"true"` enables post-login `/home`. */
export const HOMI_V4_HOME_FLAG = "HOMI_V4_HOME_ENABLED" as const;

/** Strip trailing slashes except for `/`. */
export function normalizeAppPath(path: string): string {
  if (!path) return "/";
  if (path.length > 1 && path.endsWith("/")) {
    return path.replace(/\/+$/, "") || "/";
  }
  return path;
}

export function isKeepPagePath(path: string): boolean {
  const p = normalizeAppPath(path);
  if (KEEP_PAGES.has(p)) return true;
  if (p === "/auth" || p.startsWith("/auth/")) return true;
  if (p === "/marketing" || p.startsWith("/marketing/")) return true;
  if (p.startsWith("/_vercel")) return true;
  return false;
}

/** KEEP pages + KEEP APIs (CCP `isKeepPath`). */
export function isKeepPath(path: string): boolean {
  return isKeepPagePath(path) || isKeepApiPath(path);
}

function matchesListedPath(path: string, listed: readonly string[]): boolean {
  const p = normalizeAppPath(path);
  return listed.some((item) => p === item || p.startsWith(`${item}/`));
}

export function v4AllowList(
  pending: readonly string[] = V4_PENDING_PATHS,
  live: readonly string[] = V4_LIVE_PATHS,
): readonly string[] {
  return [...pending, ...live];
}

export function isV4PendingPath(path: string): boolean {
  return matchesListedPath(path, V4_PENDING_PATHS);
}

export function isV4LivePath(path: string): boolean {
  return matchesListedPath(path, V4_LIVE_PATHS);
}

/**
 * V4_PENDING ∪ V4_LIVE. Stubs are OK: `/home` is pending; live is empty.
 * Tests may inject an allow-list so flag-true cannot activate a missing Home.
 */
export function isV4Path(
  path: string,
  allowList: readonly string[] = v4AllowList(),
): boolean {
  return matchesListedPath(path, allowList);
}

/**
 * Pre-PR15 product/role trees (and any other non-KEEP, non-V4 page).
 * Dark APIs stay `isDarkApiPath` — JSON 404, not a document redirect.
 */
export function isDarkProductPath(path: string): boolean {
  if (isApiPath(path)) return false;
  if (isKeepPagePath(path)) return false;
  if (isV4Path(path)) return false;
  if (extraLegalRedirect(path) !== null) return false;
  return true;
}

export function classifyChangeControlLane(path: string): ChangeControlLane {
  if (isV4LivePath(path)) return "V4_LIVE";
  if (isV4PendingPath(path)) return "V4_PENDING";
  if (isKeepPath(path) || extraLegalRedirect(path) !== null) return "KEEP";
  return "DARK";
}

/** Production default is off. Only the exact lowercase string `"true"` enables. */
export function isV4HomeEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[HOMI_V4_HOME_FLAG] === "true";
}

/**
 * V4_PENDING hosts (Home + named Shell workspaces) are reachable only when
 * the flag is on *and* the allow-list still names the path. V4_LIVE paths
 * pass without the Home flag (none yet). Flag default stays false — Pixel
 * Gate: do not expose `/home` until founder APPROVE VISUAL DIRECTION.
 */
export function isV4RouteActivated(
  path: string,
  options?: { v4HomeEnabled?: boolean; allowList?: readonly string[] },
): boolean {
  const allowList = options?.allowList ?? v4AllowList();
  if (!isV4Path(path, allowList)) return false;
  if (isV4LivePath(path)) return true;
  const enabled = options?.v4HomeEnabled ?? isV4HomeEnabled();
  if (!enabled) return false;
  return isV4Path(path, allowList);
}

/**
 * Rail label is Compare; workspace stays `/scenarios`.
 * Alias only — not a second V4_PENDING host.
 */
export function compareAliasRedirect(path: string): string | null {
  const p = normalizeAppPath(path);
  if (p === "/compare" || p.startsWith("/compare/")) return "/scenarios";
  return null;
}

/**
 * Extra legal routes (disclaimer, subprocessors, DMCA, …) may fold onto
 * `/legal/privacy`. KEEP legal pages return null (serve as-is).
 */
export function extraLegalRedirect(path: string): string | null {
  const p = normalizeAppPath(path);
  if (p !== "/legal" && !p.startsWith("/legal/")) return null;
  if (p === "/legal/privacy" || p === "/legal/terms" || p === "/legal/cookies") return null;
  return "/legal/privacy";
}

export function isApiPath(path: string): boolean {
  const p = normalizeAppPath(path);
  return p === "/api" || p.startsWith("/api/");
}

export function isKeepApiPath(path: string): boolean {
  const p = normalizeAppPath(path);
  return KEEP_API_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/** Product / ops JSON that must not serve after PR15. */
export function isDarkApiPath(path: string): boolean {
  return isApiPath(path) && !isKeepApiPath(path);
}
