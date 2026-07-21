import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { isProtectedPath } from "@/lib/auth/protected-routes";
import { routing } from "@/i18n/routing";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Locale routing (Module A — feat/i18n), composed WITH the auth gate below.
 * Negotiates `en` (unprefixed) vs `es` (/es/...), persists NEXT_LOCALE, and
 * internally rewrites unprefixed paths into app/[locale]/.
 */
const handleI18nRouting = createMiddleware(routing);

/** Strip a leading /es so route classification sees the logical path. */
const NON_DEFAULT_LOCALE_RE = /^\/es(?=\/|$)/;

/**
 * Paths locale routing must NOT rewrite or redirect:
 *  · /api/*              — locale-independent route handlers (CSP report,
 *    webhooks, shares, …). Auth/session refresh below still applies.
 *  · /_vercel/*          — Speed Insights script + beacon, served same-origin.
 *  · /auth/callback      — OAuth/magic-link return; must stay put so the
 *    Supabase redirectTo URL matches exactly (query code/state preserved).
 *  · /auth/sign-out      — POST route handler; a locale redirect would add a
 *    pointless 307 hop to a mutating request.
 */
function skipsLocaleRouting(path: string): boolean {
  return (
    path.startsWith("/api") ||
    path.startsWith("/_vercel") ||
    path === "/auth/callback" ||
    path === "/auth/sign-out"
  );
}

/** Locale-aware sign-in redirect: keeps Spanish users inside /es. */
function redirectToSignIn(request: NextRequest, path: string): NextResponse {
  const localePrefix = NON_DEFAULT_LOCALE_RE.test(path) ? "/es" : "";
  const redirect = request.nextUrl.clone();
  redirect.pathname = `${localePrefix}/auth/sign-in`;
  redirect.searchParams.set("next", path);
  return NextResponse.redirect(redirect);
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const logicalPath = path.replace(NON_DEFAULT_LOCALE_RE, "") || "/";
  const isProtected = isProtectedPath(logicalPath);

  // Refreshed session cookies collected here get copied onto whichever
  // response the locale router produces.
  const pendingCookies: CookieToSet[] = [];

  const finish = (): NextResponse => {
    const response = skipsLocaleRouting(path)
      ? NextResponse.next({ request })
      : handleI18nRouting(request);
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );
    return response;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Fail CLOSED: without Supabase config the session can't be verified, so
    // a protected route must never be served — send it to sign-in instead of
    // passing it through. Public routes still pass through.
    if (isProtected) {
      return redirectToSignIn(request, path);
    }
    return finish();
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        // Mutating request.cookies first means the locale router's internal
        // rewrite already forwards the refreshed session upstream.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    return redirectToSignIn(request, path);
  }

  return finish();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
