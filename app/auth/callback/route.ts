import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLifecycleEmail } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates";
import { readAttributionCookie } from "@/lib/attribution";
import { safeNext } from "@/lib/auth/safeNext";

/**
 * GET /auth/callback — exchanges a Supabase auth code (from magic link,
 * OAuth, or signup confirmation) for a session, then redirects onward.
 *
 * Post-response work (never blocks the redirect, never throws into it):
 *   • welcome email — deduped on `welcome:{user_id}`, so only the FIRST
 *     successful exchange for a user sends; later sign-ins no-op.
 *   • first-touch attribution stamp — persists the acquisition cookie
 *     (ref / utm_*) onto the profile if the profile has none yet.
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
    const user = data?.user ?? null;

    if (user?.email) {
      const attribution = readAttributionCookie(request.headers.get("cookie"));
      const email = user.email;
      const userId = user.id;
      const name = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";
      after(async () => {
        try {
          const service = createAdminClient();
          if (!service) return;

          if (attribution) {
            // First-touch only: never overwrite an existing snapshot.
            await service
              .from("profiles")
              .update({ attribution })
              .eq("id", userId)
              .is("attribution", null);
          }

          await sendLifecycleEmail({
            service,
            dedupeKey: `welcome:${userId}`,
            userId,
            to: email,
            template: "welcome",
            marketing: true,
            render: () => welcomeEmail(name),
          });
        } catch (err) {
          // Lifecycle work must never surface into the auth flow.
          console.error(
            "[auth/callback] post-auth lifecycle failed:",
            err instanceof Error ? err.message : "unknown",
          );
        }
      });
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
