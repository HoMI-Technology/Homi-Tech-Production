import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "@/lib/auth/protected-routes";
import { wwwToApexUrl, X_ROBOTS_NOINDEX } from "@/lib/seo/site";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
type AuthUser = { id: string } | null;

/**
 * Bound for the only paths that still call Supabase Auth (`getUser`).
 * Vercel Routing Middleware is killed at ~25s (MIDDLEWARE_INVOCATION_TIMEOUT).
 * Public marketing never enters this lookup.
 */
export const AUTH_LOOKUP_TIMEOUT_MS = 2_000;

/**
 * Auth gate. Refreshes the Supabase session on protected routes and the
 * retired `/results` redirect. Public marketing does not wait on Auth —
 * a slow or unreachable `getUser()` must not 504 the landing page.
 *
 * This used to compose next-intl's locale router with the auth gate; the
 * locale segment has been removed, so every path is now its own logical
 * path and the response is always a plain `next()`. `/es/*` URLs are
 * handled by a permanent redirect in next.config.ts, which runs before
 * middleware.
 */

function isSignInPath(path: string): boolean {
  return path === "/auth/sign-in";
}

function isRetiredResultsPath(path: string): boolean {
  return path === "/results" || path.startsWith("/results/");
}

function withSignInNoindex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", X_ROBOTS_NOINDEX);
  return response;
}

/** Sign-in redirect, preserving the attempted path for post-login return. */
function redirectToSignIn(request: NextRequest, path: string): NextResponse {
  const redirect = request.nextUrl.clone();
  redirect.pathname = "/auth/sign-in";
  redirect.searchParams.set("next", path);
  return withSignInNoindex(NextResponse.redirect(redirect));
}

function redirectWwwToApex(request: NextRequest): NextResponse | null {
  const apex = wwwToApexUrl(new URL(request.nextUrl.toString()), request.headers.get("host"));
  if (!apex) return null;
  return NextResponse.redirect(apex, 308);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | "timeout"> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}

/**
 * Verify the session, or treat the lookup as "no user" if Auth does not
 * answer in time. Callers already fail-closed (`!user`) on protected
 * routes and fail-open (`/first-moment`) on retired `/results`.
 */
async function getUserBounded(
  getUser: () => Promise<{ data: { user: AuthUser } }>,
): Promise<AuthUser> {
  const result = await withTimeout(getUser(), AUTH_LOOKUP_TIMEOUT_MS);
  if (result === "timeout") return null;
  return result.data.user;
}

export async function middleware(request: NextRequest) {
  const wwwRedirect = redirectWwwToApex(request);
  if (wwwRedirect) return wwwRedirect;

  const path = request.nextUrl.pathname;
  const isProtected = isProtectedPath(path);
  const needsAuthLookup = isProtected || isRetiredResultsPath(path);

  // Refreshed session cookies collected here get copied onto the response.
  const pendingCookies: CookieToSet[] = [];

  const finish = (): NextResponse => {
    const response = NextResponse.next({ request });
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );
    if (isSignInPath(path)) {
      return withSignInNoindex(response);
    }
    return response;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Fail CLOSED: without Supabase config the session can't be verified, so
    // a protected route must never be served — send it to sign-in instead of
    // passing it through. Public routes still pass through.
    if (path === "/results" || path.startsWith("/results/")) {
      const dest = request.nextUrl.clone();
      dest.pathname = "/first-moment";
      dest.search = "";
      return NextResponse.redirect(dest);
    }
    if (isProtected) {
      return redirectToSignIn(request, path);
    }
    return finish();
  }

  // Public marketing / unprotected product paths must not depend on a live
  // Supabase round-trip. Session cookie refresh stays on routes that still
  // need getUser (protected + retired /results).
  if (!needsAuthLookup) {
    return finish();
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        // Mutating request.cookies first means `NextResponse.next({ request })`
        // forwards the refreshed session upstream to the route handler.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  const user = await getUserBounded(() => supabase.auth.getUser());

  // F8 — /results is retired. Signed-in → Home Build; guests → First Moment.
  if (path === "/results" || path.startsWith("/results/")) {
    const dest = request.nextUrl.clone();
    dest.pathname = user ? "/dashboard" : "/first-moment";
    dest.search = "";
    const response = NextResponse.redirect(dest);
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );
    return response;
  }

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
