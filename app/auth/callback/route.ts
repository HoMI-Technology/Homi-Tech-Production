import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { maybeSendWelcomeEmail } from "@/lib/email/lifecycle";

/**
 * GET /auth/callback — exchanges a Supabase auth code (from magic link,
 * OAuth, or signup confirmation) for a session, then redirects onward.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

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
