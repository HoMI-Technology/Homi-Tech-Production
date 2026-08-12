import { createClient } from "@/lib/supabase/server";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminAccessWall } from "@/components/admin/AdminAccessWall";
import { Wordmark } from "@/components/brand/Wordmark";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import {
  deriveNextLevel,
  evaluateAdminAccess,
  parseAdminEmails,
  type AssuranceLevel,
} from "@/lib/auth/admin";
import type { Profile } from "@/types/database";

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

  const decision = evaluateAdminAccess({
    role: profile?.role ?? null,
    email: profile?.email ?? user?.email ?? null,
    allowlist: parseAdminEmails(env.ADMIN_EMAILS),
    requireMfa: env.ADMIN_REQUIRE_MFA,
    currentLevel,
    nextLevel,
  });

  if (!decision.allow) {
    return <AdminAccessWall reason={decision.reason} signedIn={Boolean(user)} />;
  }

  return (
    <div className="field min-h-dvh" data-operate-role="admin" data-density="compact">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10">
        <aside className="hidden w-52 shrink-0 md:block lg:w-56">
          <div className="sticky top-[var(--nav-offset)]">
            <div className="mb-5 flex items-center gap-2 border-b border-white/[0.06] px-1 pb-4">
              <Wordmark size="text-lg" />
              <span className="rounded-full border border-slate-high/40 bg-slate-surface/60 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wide text-dim">
                Admin
              </span>
            </div>
            <AdminSidebar />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <AdminMobileNav />
          {children}
        </div>
      </div>
    </div>
  );
}
