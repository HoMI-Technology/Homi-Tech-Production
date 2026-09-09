/**
 * PR15 KEEP/KILL surface map.
 *
 * Signed-in product is scratched behind the landing page. Middleware uses this
 * module as the only allow-list: KEEP pages pass through, extra legal folds to
 * `/legal/privacy`, KEEP APIs stay live, every other page goes to `/`, and
 * every other `/api/*` returns JSON 404.
 *
 * Do not restyle KEEP pages. Do not invent replacement product chrome.
 */

const KEEP_PAGES = new Set(["/", "/waitlist", "/legal/privacy", "/legal/terms", "/legal/cookies"]);

const KEEP_API_PREFIXES = ["/api/waitlist", "/api/healthcheck", "/api/csp-report"] as const;

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
