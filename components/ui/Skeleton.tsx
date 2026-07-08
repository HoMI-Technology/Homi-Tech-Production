/**
 * Generic shimmering placeholder bar. Slate-surface tones only (never brand
 * colors) — see .skeleton-shimmer in app/globals.css. Respects
 * prefers-reduced-motion (falls back to a static bg-slate-surface, no
 * animation) via the reduced-motion block alongside that class.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton-shimmer rounded-md ${className}`} />;
}
