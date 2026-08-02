import { redirect } from "next/navigation";

/**
 * Build the `next` query value the same way middleware does. Paths are
 * normalised to a leading slash; there is no locale prefix any more.
 */
export function signInNextParam(nextPath: string): string {
  return nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
}

/**
 * Redirect to `/auth/sign-in`, preserving the caller's return path in the
 * `next` query param.
 *
 * Kept async so existing `await signInRedirect(...)` call sites and their
 * `Promise<never>` control-flow narrowing are unaffected.
 */
export async function signInRedirect(nextPath: string): Promise<never> {
  const next = signInNextParam(nextPath);
  redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  // `redirect` throws; keep the Promise<never> contract explicit for
  // call-site control-flow narrowing.
  throw new Error("unreachable: signInRedirect");
}
