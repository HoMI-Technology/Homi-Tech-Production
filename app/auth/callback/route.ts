import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { maybeSendWelcomeEmail } from "@/lib/email/lifecycle";
import { safeNext } from "@/lib/auth/safeNext";
import { readAttributionCookie } from "@/lib/attribution";

/**
 * GET /auth/callback — exchanges a Supabase auth code (from magic link,
 * OAuth, or signup confirmation) for a session, then redirects onward.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // Sanitized so a crafted ?next=//evil.com can't turn the post-login
  // redirect into an off-site open redirect.
  const next = safeNext(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const user = data?.user;
    if (user?.email) {
      void maybeSendWelcomeEmail(user.id, user.email);

      // First-touch acquisition stamp (00026). First-touch wins: only fills a
      // profile that has no snapshot yet. Post-response, never blocks the redirect.
      const attribution = readAttributionCookie(request.headers.get("cookie"));
      if (attribution) {
        const userId = user.id;
        after(async () => {
          try {
            const service = createAdminClient();
            await service
              ?.from("profiles")
              .update({ attribution })
              .eq("id", userId)
              .is("attribution", null);
          } catch {
            // Attribution is best-effort — never surface into the auth flow.
          }
        });
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
