import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLifecycleEmail } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates";
import { readAttributionCookie } from "@/lib/attribution";
import {
  EMPLOYEE_HOME_SEEN_COOKIE,
  EMPLOYEE_HOME_SEEN_MAX_AGE,
  POST_LOGIN_EMPLOYEE,
  resolvePostLoginDestination,
} from "@/lib/auth/postLoginDestination";
import type { Profile } from "@/types/database";

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
  const requestedNext = url.searchParams.get("next");

  let hasCompletedAssessment = false;
  let role: Profile["role"] | null = null;
  let employerId: string | null = null;
  let onboardingCompleted: boolean | undefined;
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

    if (userId) {
      // Role and orientation state outrank assessment state in the landing
      // decision, so they are read here alongside the count.
      const [{ count }, { data: profile }] = await Promise.all([
        supabase
          .from("assessments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "completed"),
        supabase
          .from("profiles")
          .select("role, employer_id, onboarding_completed")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      hasCompletedAssessment = (count ?? 0) > 0;
      const p = profile as Pick<Profile, "role" | "employer_id" | "onboarding_completed"> | null;
      role = p?.role ?? null;
      employerId = p?.employer_id ?? null;
      onboardingCompleted = p?.onboarding_completed;
    }

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
    hasCompletedAssessment,
    role,
    employerId,
    onboardingCompleted,
    employeeHomeSeen: request.headers.get("cookie")?.includes(`${EMPLOYEE_HOME_SEEN_COOKIE}=1`),
  });

  const response = NextResponse.redirect(new URL(next, url.origin));

  // Burn the one-time employee orientation as we send them to it, so a refresh
  // or a second sign-in goes straight to the personal home. Not httpOnly: the
  // password sign-in path resolves the landing in the browser and must read it.
  if (next === POST_LOGIN_EMPLOYEE) {
    response.cookies.set(EMPLOYEE_HOME_SEEN_COOKIE, "1", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: EMPLOYEE_HOME_SEEN_MAX_AGE,
    });
  }

  return response;
}
