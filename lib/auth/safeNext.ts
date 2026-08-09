/**
 * Sanitizes a `next` redirect target so it can only ever be a same-origin,
 * relative path. Blocks open-redirect payloads: absolute URLs, protocol-
 * relative `//host`, scheme injection, and backslash tricks. Returns the
 * fallback for anything that isn't a plain in-app path.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  // Must be a rooted path.
  if (!next.startsWith("/")) return fallback;
  // Reject protocol-relative ("//evil.com") and backslash-escaped variants.
  if (
    next.startsWith("//") ||
    next.startsWith("/\\") ||
    next.startsWith("/%2f") ||
    next.startsWith("/%5c")
  ) {
    return fallback;
  }
  // Reject control chars. (Scheme-injected values like "javascript:..." or
  // "https://evil" don't start with "/", so they're already rejected above —
  // no blanket "://" ban, which would false-positive on legit paths that carry
  // a URL in a query string, e.g. "/share?to=https://…".)
  if (/[\x00-\x1f]/.test(next)) return fallback;
  return next;
}
