import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { PartnerWorkspaceV4 } from "@/components/v4/partner/PartnerWorkspaceV4";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { canAccessPartnerDashboard } from "@/lib/dashboard/partner-access";
import {
  PartnerSiteUrlError,
  resolvePartnerInviteOrigin,
} from "@/lib/dashboard/partner-site-url";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import {
  buildPartnerV4View,
  parseV4PartnerVisualState,
  partnerV4PulseFromLive,
  partnerV4VisualView,
  type PartnerV4Pulse,
} from "@/lib/v4/partner-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";
import type { Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Partner",
  description:
    "Invite clients to a first moment. Book pulse from referral_source. Never invent a client list or scores.",
  robots: { index: false, follow: false },
};

/**
 * Partner v4 — V4_PENDING `/partner/dashboard` (covered by `/partner` prefix).
 * Shell v4 operate home. Portals redirect here. Invite is `/first-moment?ref=`.
 * SITE_URL fail-loud. never writes score or ledger. Shadow-score invite stays dead.
 * Read-only toward client verdicts — never a partner-written AssessmentResult.
 */
export default async function PartnerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled()
    ? parseV4PartnerVisualState(params.visual)
    : null;

  if (visual) {
    return <PartnerWorkspaceV4 view={partnerV4VisualView(visual)} />;
  }

  const user = await getCachedUser();
  if (!user) return signInRedirect("/partner/dashboard");

  const supabase = await getCachedClient();
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = (profileData as Profile | null) ?? null;

  if (!canAccessPartnerDashboard(profile)) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <AccessPanel
          title="Partner access required"
          body="This dashboard is for HōMI partners. Apply to the partner program or request an account upgrade."
          href="/partner"
          linkLabel="Learn about the partner program"
        />
      </div>
    );
  }

  // Stable invite code (mint on first visit).
  let partnerCode: string | null = null;
  try {
    const { data: existing } = await supabase
      .from("partner_codes")
      .select("code")
      .eq("partner_user_id", user.id)
      .maybeSingle();
    if (existing?.code) {
      partnerCode = existing.code as string;
    } else {
      const code = `ptr_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
      const { data: inserted } = await supabase
        .from("partner_codes")
        .insert({ code, partner_user_id: user.id })
        .select("code")
        .maybeSingle();
      partnerCode = (inserted?.code as string | undefined) ?? code;
    }
  } catch {
    partnerCode = null;
  }

  const requestHeaders = await headers();
  let origin: string | null = null;
  let originMissing = false;
  try {
    origin = resolvePartnerInviteOrigin({
      envUrl: process.env.NEXT_PUBLIC_SITE_URL,
      host: requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
      proto: requestHeaders.get("x-forwarded-proto"),
    });
  } catch (error) {
    if (error instanceof PartnerSiteUrlError) {
      originMissing = true;
    } else {
      throw error;
    }
  }

  const inviteUrl = partnerCode ? (origin ? `${origin}/first-moment?ref=${partnerCode}` : null) : null;

  // L0 — attributed assessments via denormalized referral_source (invite path).
  const { data: referredRows } = await supabase
    .from("assessments")
    .select("id, user_id, completed_at, created_at, is_shadow")
    .eq("referral_source", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(100);

  type BookRow = {
    id: string;
    user_id: string;
    completed_at: string | null;
    created_at: string;
    is_shadow: boolean | null;
  };

  let attributed: BookRow[] = (referredRows as BookRow[] | null) ?? [];

  // Fallback: portal RPC if denorm empty but code exists (pre-I0 traffic).
  if (partnerCode && attributed.length === 0) {
    try {
      const { data: recent } = await supabase.rpc("partner_recent_assessments", {
        p_code: partnerCode,
        p_limit: 20,
      });
      if (Array.isArray(recent) && recent.length > 0) {
        attributed = recent.map(
          (
            r: {
              created_at: string | null;
              is_shadow: boolean | null;
            },
            i: number,
          ) => ({
            id: `rpc-${i}`,
            user_id: "",
            completed_at: r.created_at,
            created_at: r.created_at ?? new Date().toISOString(),
            is_shadow: r.is_shadow,
          }),
        );
      }
    } catch {
      // RPC unavailable — keep empty
    }
  }

  // L1 — explicit roster SSOT (names allowed; no emails). v4 fold never paints a client list.
  await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("partner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const pulse: PartnerV4Pulse[] = attributed
    .filter((row) => row.is_shadow !== true)
    .map((row) =>
      partnerV4PulseFromLive({
        id: row.id,
        liveAt: row.completed_at ?? row.created_at,
      }),
    );

  return (
    <PartnerWorkspaceV4
      view={buildPartnerV4View({
        originMissing,
        inviteUrl,
        mintFailed: !originMissing && !partnerCode, // Could not mint an invite code
        pulse,
      })}
    />
  );
}
