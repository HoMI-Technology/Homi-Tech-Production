import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CopyrightYear } from "@/components/layout/CopyrightYear";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { LEGAL_DISCLAIMER } from "@/lib/brand";

interface FooterLink {
  href: string;
  key: string;
}

interface FooterColumn {
  ns: string;
  links: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    ns: "product",
    links: [
      { href: "/assessment", key: "fullAssessment" },
      { href: "/shadow-score", key: "shadowScore" },
      { href: "/tools", key: "financeTools" },
      { href: "/advisor", key: "decisionCompanion" },
      { href: "/pricing", key: "pricing" },
    ],
  },
  {
    ns: "learn",
    links: [
      { href: "/how-it-works", key: "howItWorks" },
      { href: "/method", key: "method" },
      { href: "/guides", key: "guides" },
      { href: "/about", key: "about" },
    ],
  },
  {
    ns: "forTeams",
    links: [
      { href: "/b2b", key: "employers" },
      { href: "/partner", key: "partners" },
      { href: "/employee", key: "employee" },
    ],
  },
  {
    ns: "legal",
    links: [
      { href: "/legal/privacy", key: "privacy" },
      { href: "/legal/terms", key: "terms" },
      { href: "/legal/disclaimer", key: "disclaimer" },
      { href: "/legal/cookies", key: "cookies" },
      { href: "mailto:support@homitechnology.com", key: "support" },
    ],
  },
];

export function SiteFooter() {
  const t = useTranslations("footer");

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
              {t("tagline")}
            </p>
            <p className="mt-3 text-sm font-medium text-light">
              {t("motto")}
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
            <nav key={col.ns} aria-label={t(`columns.${col.ns}.title`)}>
              {/* Not a heading: pages end their own outlines at varying levels,
                  so a fixed h3 here trips heading-order on h1-only pages. The
                  nav's aria-label already names the group. */}
              <p className="text-sm font-semibold text-light">{t(`columns.${col.ns}.title`)}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-dim transition-colors hover:text-cyan">
                      {t(`columns.${col.ns}.${l.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="hairline my-10" />

        {/* Legal canon (lib/brand LEGAL_DISCLAIMER) stays English in every
            locale — it is regulatory text, not marketing copy. */}
        <p className="text-xs leading-relaxed text-dim/80">{LEGAL_DISCLAIMER}</p>
        <div className="mt-6 flex flex-col items-start justify-between gap-3 text-xs text-dim/70 sm:flex-row">
          <span>
            © <CopyrightYear initial={new Date().getFullYear()} /> {t("rights")}
          </span>
          <span>{t("badge")}</span>
        </div>
      </div>
    </footer>
  );
}
