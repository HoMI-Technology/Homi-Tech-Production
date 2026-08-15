import Link from "next/link";
import { CopyrightYear } from "@/components/layout/CopyrightYear";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { LEGAL_DISCLAIMER, TAGLINES } from "@/lib/brand";

interface FooterLink {
  href: string;
  label: string;
}

interface FooterColumn {
  ns: string;
  title: string;
  links: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    ns: "product",
    title: "Product",
    links: [
      { href: "/first-moment", label: "Assess" },
      { href: "/first-moment", label: "Full Assessment" },
      { href: "/waitlist", label: "Waitlist" },
      { href: "/money", label: "Money" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    ns: "learn",
    title: "Learn",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/method", label: "The Method" },
      { href: "/guides", label: "Guides" },
      { href: "/about", label: "About" },
      { href: "/status", label: "Status" },
    ],
  },
  {
    ns: "forTeams",
    title: "For Teams",
    links: [
      { href: "/b2b", label: "Employers" },
      { href: "/partner", label: "Partners" },
      { href: "/employee", label: "Employee Benefit" },
    ],
  },
  {
    ns: "legal",
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/disclaimer", label: "Disclaimer" },
      { href: "/legal/cookies", label: "Cookie policy" },
      { href: "/legal/acceptable-use", label: "Acceptable use" },
      { href: "/legal/dmca", label: "DMCA" },
      { href: "/legal/subprocessors", label: "Subprocessors" },
      { href: "mailto:support@homitechnology.com", label: "Support" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-20 border-t border-slate-surface/60 sm:mt-24">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 sm:gap-12 md:grid-cols-4 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="sm:col-span-2 md:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-3">
              <ThresholdCompass size={44} animated={false} glow={false} />
              <Wordmark size="text-xl" />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-dim">
              A Decision Companion. Financial Reality · Emotional Truth · Perfect Timing.
            </p>
            <p className="mt-3 text-sm font-medium text-light">{TAGLINES.primary}</p>
            <a
              href="https://x.com/homi_tech"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="HōMI on X (opens in a new tab)"
              className="mt-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-surface/60 text-dim transition-colors hover:border-cyan/40 hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.ns} aria-label={col.title}>
              {/* Not a heading: pages end their own outlines at varying levels,
                  so a fixed h3 here trips heading-order on h1-only pages. The
                  nav's aria-label already names the group. */}
              <p className="text-sm font-semibold text-light">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={`${l.href}:${l.label}`}>
                    <Link
                      href={l.href}
                      className="text-sm text-dim transition-colors hover:text-cyan"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="hairline my-10" />

        {/* Legal canon (lib/brand LEGAL_DISCLAIMER) is regulatory text, not
            marketing copy — it is rendered verbatim. */}
        <p className="text-xs leading-relaxed text-dim/80">{LEGAL_DISCLAIMER}</p>
        <div className="mt-6 flex flex-col items-start justify-between gap-3 text-xs text-dim/70 sm:flex-row">
          <span>
            © <CopyrightYear initial={new Date().getFullYear()} /> HOMI TECHNOLOGIES LLC. All rights
            reserved.
          </span>
          <span>
            Decision Readiness Intelligence™ | Educational Guidance Only | Not Financial Advice
          </span>
        </div>
      </div>
    </footer>
  );
}
