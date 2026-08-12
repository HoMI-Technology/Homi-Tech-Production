import Link from "next/link";
import type { AttentionItem } from "@/components/operate/AttentionStrip";
import { todaySecondaryCtas, type TodayCta } from "@/lib/admin/marketing-command";

const SEVERITY_STYLE: Record<AttentionItem["severity"], string> = {
  critical: "border-crimson/40 bg-crimson/10 text-light",
  warn: "border-amber/40 bg-verdict-build text-light",
  info: "border-cyan/30 bg-cyan/5 text-light",
  ok: "border-emerald/30 bg-emerald/5 text-light",
};

const DOT: Record<AttentionItem["severity"], string> = {
  critical: "bg-crimson",
  warn: "bg-amber",
  info: "bg-cyan",
  ok: "bg-emerald",
};

function CtaLink({ cta }: { cta: TodayCta }) {
  const className = "btn btn-ghost btn-sm";
  if (cta.external || cta.href.startsWith("/marketing/")) {
    return (
      <a href={cta.href} target="_blank" rel="noreferrer" className={className}>
        {cta.label}
      </a>
    );
  }
  if (cta.href.startsWith("#")) {
    return (
      <a href={cta.href} className={className}>
        {cta.label}
      </a>
    );
  }
  return (
    <Link href={cta.href} className={className}>
      {cta.label}
    </Link>
  );
}

/**
 * Sticky (md+) Today ops strip — primary attention + canonical secondaries.
 * Static below md so AdminMobileNav remains the only sticky chrome.
 */
export function MarketingTodayStrip({ primary }: { primary: AttentionItem }) {
  const title =
    primary.title.length > 48 ? `${primary.title.slice(0, 47).trimEnd()}…` : primary.title;
  const primaryIsScoreboard = (primary.cta ?? "").toLowerCase().includes("scoreboard");
  const secondaries = todaySecondaryCtas({ primaryIsScoreboard });

  return (
    <div
      className="mt-6 md:sticky md:top-[var(--nav-offset)] md:z-10"
      data-marketing-today
    >
      <section
        className={`rounded-xl border px-3 py-3 shadow-lg shadow-black/20 backdrop-blur-md sm:px-4 ${SEVERITY_STYLE[primary.severity]} bg-navy/90 md:bg-navy/95`}
        aria-label="Today — what needs attention"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full sm:mt-0 ${DOT[primary.severity]}`}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-3xs font-semibold uppercase tracking-wide text-dim">Today</p>
              <p className="truncate text-sm font-semibold text-light" title={primary.title}>
                {title}
              </p>
              {primary.detail && (
                <p className="mt-0.5 hidden max-w-xl truncate text-xs text-dim sm:block" title={primary.detail}>
                  {primary.detail}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {primary.href && primary.cta && (
              <Link href={primary.href} className="btn btn-primary btn-sm">
                {primary.cta}
              </Link>
            )}
            {secondaries.map((c) => (
              <CtaLink key={c.label + c.href} cta={c} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
