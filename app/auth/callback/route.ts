import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { maybeSendWelcomeEmail } from "@/lib/email/lifecycle";
import { safeNext } from "@/lib/auth/safeNext";

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
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
