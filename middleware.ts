import { NextResponse, type NextRequest } from "next/server";
import {
  compareAliasRedirect,
  extraLegalRedirect,
  isDarkApiPath,
  isKeepPath,
  isV4Path,
  isV4RouteActivated,
} from "@/lib/auth/keep-routes";
import { wwwToApexUrl, X_ROBOTS_NOINDEX } from "@/lib/seo/site";

/**
 * PR15 KEEP/KILL gate + CCP v1 route activation (thin hook).
 *
 * Public KEEP surfaces (landing, auth, legal, waitlist, brand assets) pass
 * through. Extra legal folds to `/legal/privacy`. Dark product APIs 404.
 * V4_PENDING `/home` passes only when `HOMI_V4_HOME_ENABLED=true` and the
 * allow-list still names Home; otherwise it folds to `/` like DARK pages.
 * Every other URL — guest or signed-in — lands on `/`. Session lookup is
 * gone: there is no product shell left to protect.
 *
 * www → apex still runs first so host canonicalization stays one hop.
 */

function isSignInPath(path: string): boolean {
  return path === "/auth/sign-in";
}

function withSignInNoindex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", X_ROBOTS_NOINDEX);
  return response;
}

function redirectWwwToApex(request: NextRequest): NextResponse | null {
  const apex = wwwToApexUrl(new URL(request.nextUrl.toString()), request.headers.get("host"));
  if (!apex) return null;
  return NextResponse.redirect(apex, 308);
}

function redirectToHome(request: NextRequest): NextResponse {
  const dest = request.nextUrl.clone();
  dest.pathname = "/";
  dest.search = "";
  dest.hash = "";
  return NextResponse.redirect(dest);
}

function darkApiResponse(): NextResponse {
  return NextResponse.json(
    { error: "not_found" },
    { status: 404, headers: { "cache-control": "no-store" } },
  );
}

/** Forward the matched path so (product) layout can lock Shell v4 on SSR. */
function nextWithProductPath(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-homi-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function middleware(request: NextRequest) {
  const wwwRedirect = redirectWwwToApex(request);
  if (wwwRedirect) return wwwRedirect;

  const path = request.nextUrl.pathname;

  const legalDest = extraLegalRedirect(path);
  if (legalDest) {
    const dest = request.nextUrl.clone();
    dest.pathname = legalDest;
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  const compareDest = compareAliasRedirect(path);
  if (compareDest) {
    if (!isV4RouteActivated(compareDest)) {
      return redirectToHome(request);
    }
    const dest = request.nextUrl.clone();
    dest.pathname = compareDest;
    return NextResponse.redirect(dest);
  }

  if (isDarkApiPath(path)) {
    return darkApiResponse();
  }

  if (isKeepPath(path)) {
    const response = NextResponse.next({ request });
    if (isSignInPath(path)) {
      return withSignInNoindex(response);
    }
    return response;
  }

  if (isV4Path(path) && isV4RouteActivated(path)) {
    return nextWithProductPath(request);
  }

  return redirectToHome(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
