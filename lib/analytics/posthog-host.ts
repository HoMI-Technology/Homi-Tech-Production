/**
 * Normalize NEXT_PUBLIC_POSTHOG_HOST from env.
 *
 * Operators sometimes paste `.env.example` comments into Vercel
 * (`https://us.i.posthog.com   # Or https://eu.i.posthog.com`). Strip
 * inline comments + whitespace so capture / HogQL still hit a real host.
 */
export function sanitizePosthogHost(
  raw: string | undefined,
  fallback = "https://us.i.posthog.com",
): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return fallback;
  const withoutComment = trimmed.split("#", 1)[0]?.trim() ?? "";
  if (!withoutComment) return fallback;
  return withoutComment.replace(/\/+$/, "");
}
