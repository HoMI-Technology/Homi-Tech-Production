import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

/**
 * Build the `next` query value the same way middleware does: unprefixed for
 * the default locale, `/es/...` for Spanish so post-login return keeps locale.
 */
export function signInNextParam(nextPath: string, locale: string): string {
  const normalized = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  if (locale === "en") return normalized;
  if (normalized === `/${locale}` || normalized.startsWith(`/${locale}/`)) {
    return normalized;
  }
  return `/${locale}${normalized}`;
}

/**
 * Locale-aware redirect to `/auth/sign-in`. Uses next-intl `redirect` so
 * Spanish users land on `/es/auth/sign-in?next=/es/...` instead of dropping
 * the locale via a hard-coded `next/navigation` redirect.
 */
export async function signInRedirect(nextPath: string): Promise<never> {
  const locale = (await getLocale()) as AppLocale;
  const next = signInNextParam(nextPath, locale);
  redirect({
    href: {
      pathname: "/auth/sign-in",
      query: { next },
    },
    locale,
  });
  // next-intl's redirect is typed looser than Next's `never`; keep the
  // Promise<never> contract for call-site control-flow narrowing.
  throw new Error("unreachable: signInRedirect");
}
