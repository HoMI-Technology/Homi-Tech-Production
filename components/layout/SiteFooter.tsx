import Link from "next/link";
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
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-slate-surface/60">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
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
          <span>© {new Date().getFullYear()} HOMI TECHNOLOGIES LLC. All rights reserved.</span>
          <span>HōMI · Decision Readiness Intelligence™ | Educational Guidance Only | Not Financial Advice</span>
        </div>
      </div>
    </footer>
  );
}
