import { createClient } from "@/lib/supabase/server";
import { AdminAccessWall } from "@/components/admin/AdminAccessWall";
import { AdminOperateChrome } from "@/components/admin/AdminOperateChrome";
import { env } from "@/lib/env";
import {
  deriveNextLevel,
  evaluateAdminAccess,
  parseAdminEmails,
  type AssuranceLevel,
} from "@/lib/auth/admin";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      profile = (data as Profile | null) ?? null;
    } catch {
      profile = null;
    }
  }

  // Resolve the session's MFA assurance level (best-effort; a failure is
  // treated as "no verified factor" so the flags fail safe, never open).
  //
  // The two levels come from different sources on purpose. currentLevel is the
  // session's own `aal` claim, which is accurate for the request in hand.
  // nextLevel must NOT come from the same call: it is derived from the cached
  // session user, which is written at sign-in, so an admin who enrolls TOTP on
  // an existing session would read as factor-less and be told to enroll again.
  let currentLevel: AssuranceLevel | null = null;
  let nextLevel: AssuranceLevel | null = null;
  if (user) {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      currentLevel = (data?.currentLevel as AssuranceLevel | null) ?? null;
    } catch {
      currentLevel = null;
    }
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      nextLevel = deriveNextLevel(data?.totp ?? null);
    } catch {
      nextLevel = null;
    }
  }

  // MFA is always-on policy (2026-08) — no env knob. evaluateAdminAccess
  // decides between allow / needs-stepup / needs-enrollment / not-admin.
  const decision = evaluateAdminAccess({
    role: profile?.role ?? null,
    email: profile?.email ?? user?.email ?? null,
    allowlist: parseAdminEmails(env.ADMIN_EMAILS),
    currentLevel,
    nextLevel,
  });

  if (!decision.allow) {
    return <AdminAccessWall reason={decision.reason} signedIn={Boolean(user)} />;
  }

  return <AdminOperateChrome>{children}</AdminOperateChrome>;
}
