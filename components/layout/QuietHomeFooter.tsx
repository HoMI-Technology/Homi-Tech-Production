import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { TAGLINES } from "@/lib/brand";

const SOCIAL_CLASS = "text-sm text-dim hover:text-light";

/** Full canon disclaimer (2026-08 audit fix 9) — same sentence SitemapFooter carries. */
const CANON_DISCLAIMER =
  "HōMI provides educational guidance only. Consider consulting qualified professionals before making legal, tax, mortgage, investment, or real estate decisions.";

const LEGAL = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/cookies", label: "Cookies" },
  { href: "mailto:support@homitechnology.com", label: "Support" },
  { href: "/waitlist", label: "Waitlist" },
] as const;

/** Quiet three-row footer — the only cut SiteFooter mounts. */
export function QuietHomeFooter() {
  return (
    <footer className="site-footer relative z-10 mt-0 border-t border-slate-surface/60 bg-navy">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-6">
          <div>
            <Wordmark size="text-xl" />
            <p className="mt-3 max-w-md font-sans text-sm text-dim">{TAGLINES.primary}</p>
          </div>

          <nav aria-label="Legal" className="font-sans text-sm text-dim">
            {LEGAL.map((item, i) => (
              <span key={item.href}>
                {i > 0 ? <span className="px-2 text-dim/40">·</span> : null}
                {item.href.startsWith("mailto:") ? (
                  <a href={item.href} className="hover:text-cyan">
                    {item.label}
                  </a>
                ) : (
                  <Link href={item.href} className="hover:text-cyan">
                    {item.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          <div className="flex gap-6">
            <a
              href="https://x.com/homi_tech"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="HōMI on X (opens in a new tab)"
              className={SOCIAL_CLASS}
            >
              X
            </a>
            <a
              href="https://www.tiktok.com/@homi_technology"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="HōMI on TikTok (opens in a new tab)"
              className={SOCIAL_CLASS}
            >
              TikTok
            </a>
          </div>

          <p className="max-w-2xl text-sm text-dim">{CANON_DISCLAIMER}</p>
        </div>
      </div>
    </footer>
  );
}
