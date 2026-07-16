import Link from "next/link";

/** Shown when a signed-in user lacks the tier capability for a feature. */
export function UpgradePanel({
  title = "Upgrade to unlock",
  body,
  feature,
  minTier = "plus",
}: {
  title?: string;
  body: string;
  /** Short label for analytics / screen readers. */
  feature: string;
  /** Lowest tier that unlocks this capability — used in CTA copy only. */
  minTier?: "plus" | "pro" | "family";
}) {
  const tierLabel =
    minTier === "family" ? "HōMI Family" : minTier === "pro" ? "HōMI Pro" : "HōMI Plus";

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-2xl items-center px-6 py-16">
      <div className="glass w-full p-10 text-center" data-feature-gate={feature}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan/10">
          <svg
            width="22"
            height="22"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="text-cyan"
            aria-hidden
          >
            <path d="M10 2l2.2 4.5 5 .7-3.6 3.5.9 5L10 13.8 5.5 15.7l.9-5L3 7.2l5-.7L10 2z" />
          </svg>
        </div>
        <h1 className="mt-5 font-display text-2xl text-light">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">{body}</p>
        <p className="mt-2 text-xs text-dim/80">Included with {tierLabel} and above.</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/pricing" className="btn btn-primary">
            See plans
          </Link>
          <Link href="/dashboard" className="btn btn-ghost">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
