import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminMarketingV4 } from "@/components/v4/admin/AdminMarketingV4";
import type { MarketingAssetRow } from "@/lib/admin/agency-approvals";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import {
  adminV4DraftsFromAssets,
  adminV4VisualDrafts,
  parseV4AdminVisualState,
} from "@/lib/v4/admin-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Marketing | Admin",
  description:
    "X + TikTok only. Queue/Approve not Publish. No auto-publish. Non-engine peers stay off.",
  robots: { index: false, follow: false },
};

export default async function AdminMarketingPage({
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
    return <AdminMarketingV4 assets={[]} drafts={adminV4VisualDrafts(visual)} />;
  }

  const supabase = await createClient();
  let pendingAssets: MarketingAssetRow[] = [];
  try {
    const { data } = await supabase
      .from("marketing_assets")
      .select("*")
      .in("status", ["draft", "in_review"])
      .order("created_at", { ascending: false })
      .limit(40);
    pendingAssets = (data as MarketingAssetRow[] | null) ?? [];
  } catch {
    pendingAssets = [];
  }

  const engineAssets = pendingAssets.filter(
    (row) => row.platform === "x" || row.platform === "tiktok",
  );

  return (
    <AdminMarketingV4
      assets={engineAssets}
      drafts={adminV4DraftsFromAssets(engineAssets)}
    />
  );
}
