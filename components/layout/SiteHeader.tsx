"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { HeaderShell, isActivePath } from "@/components/layout/HeaderShell";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

const NAV = [
  { href: "/how-it-works", key: "howItWorks" },
  { href: "/assessment", key: "assessment" },
  { href: "/tools", key: "tools" },
  { href: "/guides", key: "guides" },
  { href: "/pricing", key: "pricing" },
  { href: "/b2b", key: "forTeams" },
] as const;

/** Marketing header for anonymous visitors. Chrome lives in HeaderShell. */
export function SiteHeader() {
  const t = useTranslations("nav");
  // Locale-aware pathname (no /es prefix) so active-route checks hold in Spanish.
  const pathname = usePathname();

  return (
    <HeaderShell
      logoHref="/"
      logoAriaLabel={t("homeAria")}
      menuId="site-mobile-menu"
      nav={NAV.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              active ? "text-cyan" : "text-dim hover:text-light"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {t(item.key)}
          </Link>
        );
      })}
      right={
        <>
          <LanguageSwitcher />
          <NotificationBell />
          <Link href="/auth/sign-in" className="text-sm text-dim transition-colors hover:text-light">
            {t("signIn")}
          </Link>
          <Link href="/shadow-score" className="btn btn-primary !px-4 !py-2 text-sm">
            {t("getYourScore")}
          </Link>
        </>
      }
      menuContent={
        <>
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-xs uppercase tracking-wide text-dim">{t("menu")}</span>
            <NotificationBell />
          </div>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm text-light hover:bg-slate-surface">
              {t(item.key)}
            </Link>
          ))}
          <div className="hairline my-2" />
          <div className="px-1 py-1">
            <LanguageSwitcher />
          </div>
          <Link href="/auth/sign-in" className="rounded-lg px-3 py-2 text-sm text-dim">
            {t("signIn")}
          </Link>
          <Link href="/shadow-score" className="btn btn-primary mt-1">
            {t("getYourScore")}
          </Link>
        </>
      }
    />
  );
}
