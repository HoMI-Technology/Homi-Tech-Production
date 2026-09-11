import type { Metadata } from "next";
import { AdminWorkspaceV4 } from "@/components/v4/admin/AdminWorkspaceV4";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import {
  buildAdminV4View,
  parseV4AdminVisualState,
  adminV4VisualView,
} from "@/lib/v4/admin-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin",
  description: "What needs ops attention now — live SSOT only. Never invent queues, scores, or $.",
  robots: { index: false, follow: false },
};

/**
 * Admin v4 — V4_PENDING `/admin` (prefix covers existing rooms).
 * Shell v4 ops console. AttentionStrip first. Companion/Ask off.
 * PageFrame wrap is leftover craft. Score theater stays off. Never invent $.
 */
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled()
    ? parseV4AdminVisualState(params.visual)
    : null;

  if (visual) {
    return <AdminWorkspaceV4 view={adminV4VisualView(visual)} />;
  }

  const user = await getCachedUser();
  if (!user) return signInRedirect("/admin");

  const supabase = await getCachedClient();

  let waitlistCount = 0;
  let activityCount = 0;
  let emailFailedCount = 0;

  try {
    const { count } = await supabase.from("waitlist").select("*", { count: "exact", head: true });
    waitlistCount = count ?? 0;
  } catch {
    waitlistCount = 0;
  }

  try {
    const { count } = await supabase.from("audit_log").select("*", { count: "exact", head: true });
    activityCount = count ?? 0;
  } catch {
    activityCount = 0;
  }

  try {
    const { count } = await supabase
      .from("campaign_sends")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed");
    emailFailedCount = count ?? 0;
  } catch {
    emailFailedCount = 0;
  }

  return (
    <AdminWorkspaceV4
      view={buildAdminV4View({
        waitlistCount,
        activityCount,
        emailFailedCount,
      })}
    />
  );
}
