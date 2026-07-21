"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * LanguageSwitcher — compact EN/ES segmented control in the header and in
 * settings. Switching keeps the current page: next-intl's router re-renders
 * it under the other locale prefix (`/pricing` ⇄ `/es/pricing`).
 *
 * Persistence: the NEXT_LOCALE cookie. We set it synchronously here so the
 * choice survives even if the very next request hits a path the middleware
 * passes through untouched; the middleware (re)sets it authoritatively on
 * every routed response anyway.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("switcher");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function select(next: AppLocale) {
    if (next === locale || pending) return;
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;SameSite=Lax`;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={`inline-flex items-center rounded-full border border-slate-high/60 bg-navy-light/60 p-0.5 ${
        pending ? "opacity-70" : ""
      } ${className}`}
    >
      {routing.locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => select(l)}
            aria-pressed={active}
            aria-label={t(l === "en" ? "english" : "spanish")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors ${
              active
                ? "bg-cyan/15 text-cyan shadow-[0_0_10px_rgba(34,211,238,0.25)]"
                : "text-dim hover:text-light"
            }`}
          >
            {t(l === "en" ? "shortEn" : "shortEs")}
          </button>
        );
      })}
    </div>
  );
}
