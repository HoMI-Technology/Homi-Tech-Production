import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLifecycleEmail } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates";
import { readAttributionCookie } from "@/lib/attribution";
import { resolvePostLoginDestination } from "@/lib/auth/postLoginDestination";

/**
 * GET /auth/callback — exchanges a Supabase auth code (from magic link,
 * OAuth, or signup confirmation) for a session, then redirects onward.
 *
 * Post-response work (never blocks the redirect, never throws into it):
 *   • welcome email — deduped on `welcome:{user_id}`, so only the FIRST
 *     successful exchange for a user sends; later sign-ins no-op.
 *   • first-touch attribution stamp — persists the acquisition cookie
 *     (ref / utm_*) onto the profile if the profile has none yet.
 *
 * PR15: destination is always `/` (never `/dashboard` or role homes).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");

  let userId: string | null = null;
  let userEmail: string | null = null;
  let userName = "there";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const user = data?.user ?? null;
    userId = user?.id ?? null;
    userEmail = user?.email ?? null;
    userName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";

    if (userEmail && userId) {
      const attribution = readAttributionCookie(request.headers.get("cookie"));
      const email = userEmail;
      const id = userId;
      const name = userName;
      after(async () => {
        try {
          const service = createAdminClient();
          if (!service) return;

          if (attribution) {
            // First-touch only: never overwrite an existing snapshot.
            await service
              .from("profiles")
              .update({ attribution })
              .eq("id", id)
              .is("attribution", null);
          }

          await sendLifecycleEmail({
            service,
            dedupeKey: `welcome:${id}`,
            userId: id,
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

  const next = resolvePostLoginDestination({
    requestedNext,
    hasCompletedAssessment: false,
  });

  return NextResponse.redirect(new URL(next, url.origin));
}
