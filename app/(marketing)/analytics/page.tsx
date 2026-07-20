import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Marketing Analytics | HōMI",
  description: "Acquisition funnel metrics — admin only.",
  robots: { index: false, follow: false },
};

export default async function MarketingAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?next=/analytics");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const profile = (profileData as Pick<Profile, "role"> | null) ?? null;

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  let waitlist = 0;
  let signups30 = 0;
  let assessments30 = 0;
  let referred30 = 0;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  try {
    const { count } = await supabase.from("waitlist").select("*", { count: "exact", head: true });
    waitlist = count ?? 0;
  } catch {
    waitlist = 0;
  }

  try {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceIso);
    signups30 = count ?? 0;
  } catch {
    signups30 = 0;
  }

  try {
    const { count } = await supabase
      .from("assessments")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("created_at", sinceIso);
    assessments30 = count ?? 0;
  } catch {
    assessments30 = 0;
  }

  try {
    const { count } = await supabase
      .from("assessments")
      .select("*", { count: "exact", head: true })
      .not("referral_source", "is", null)
      .gte("created_at", sinceIso);
    referred30 = count ?? 0;
  } catch {
    referred30 = 0;
  }

  return (
    <div className="field min-h-screen pt-[72px]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="eyebrow">Growth</p>
        <h1 className="mt-1 font-display text-3xl text-light">Marketing analytics</h1>
        <p className="mt-2 text-dim">Admin-only acquisition signals — last 30 days where noted.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Waitlist" value={waitlist.toLocaleString()} accent="#fab633" footer="All time" />
          <StatTile label="Signups" value={signups30.toLocaleString()} accent="#22d3ee" footer="Last 30 days" />
          <StatTile
            label="Assessments"
            value={assessments30.toLocaleString()}
            accent="#34d399"
            footer="Completed · 30d"
          />
          <StatTile
            label="Referred"
            value={referred30.toLocaleString()}
            accent="#a78bfa"
            footer="With referral_source · 30d"
          />
        </div>

        <div className="glass mt-8 p-6">
          <SectionHeader
            eyebrow="Funnel"
            title="How to read this"
            subtitle="Waitlist → signups → assessments. referral_source tracks partner/campaign attribution after migration 00032."
          />
        </div>

        <p className="mt-10 text-center text-xs text-dim">Internal metrics only. HōMI Technologies LLC.</p>
      </div>
    </div>
  );
}
