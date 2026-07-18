import Link from "next/link";
import { CopyrightYear } from "@/components/layout/CopyrightYear";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { LEGAL_DISCLAIMER } from "@/lib/brand";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/assessment", label: "Full Assessment" },
      { href: "/shadow-score", label: "Shadow Score" },
      { href: "/tools", label: "Finance Tools" },
      { href: "/advisor", label: "Decision Companion" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/method", label: "The Method" },
      { href: "/guides", label: "Guides" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "For Teams",
    links: [
      { href: "/b2b", label: "Employers" },
      { href: "/partner", label: "Partners" },
      { href: "/employee", label: "Employee Benefit" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/disclaimer", label: "Disclaimer" },
      { href: "/legal/cookies", label: "Cookie policy" },
      { href: "mailto:support@homitechnology.com", label: "Support" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-slate-surface/60">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="sm:col-span-2 md:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-3">
              <ThresholdCompass size={44} animated={false} glow={false} />
              <Wordmark size="text-xl" />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-dim">
              A Decision Companion. Financial Reality · Emotional Truth · Perfect Timing.
            </p>
            <p className="mt-3 text-sm font-medium text-light">
              Know when you&rsquo;re ready. Move when it matters.
            </p>
            <a
              href="https://x.com/homi_tech"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="HōMI on X"
              className="mt-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-surface/60 text-dim transition-colors hover:text-cyan"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-sm font-semibold text-light">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-dim transition-colors hover:text-cyan">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="hairline my-10" />

        <p className="text-xs leading-relaxed text-dim/80">{LEGAL_DISCLAIMER}</p>
        <div className="mt-6 flex flex-col items-start justify-between gap-3 text-xs text-dim/70 sm:flex-row">
          <span>
            © <CopyrightYear initial={new Date().getFullYear()} /> HOMI TECHNOLOGIES LLC. All rights reserved.
          </span>
          <span>Decision Readiness Intelligence™ | Educational Guidance Only | Not Financial Advice</span>
        </div>
      </div>
    </footer>
  );
}
