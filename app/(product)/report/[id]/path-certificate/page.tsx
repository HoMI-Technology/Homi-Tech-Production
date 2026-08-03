import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { VERDICT_META, LEGAL_DISCLAIMER } from "@/lib/brand";
import { Wordmark } from "@/components/brand/Wordmark";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { CredentialPrintButton } from "@/components/assessment/CredentialPrintButton";
import { UpgradePanel } from "@/components/ui/UpgradePanel";
import { getUserEntitlements } from "@/lib/entitlements";
import { CERTIFICATE_LEGAL, HOUSEHOLD_LEGAL_SHORT } from "@/lib/readiness/legal";
import type { AssessmentRow, Profile } from "@/types/database";

/**
 * Partner/B2B packaging: readiness certificate that also points to Path posture.
 * Plus+ fullReport gate — same as credential.
 */
export default async function PathCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return signInRedirect(`/report/${id}/path-certificate`);
  }

  const { entitlements } = await getUserEntitlements(supabase);
  if (!entitlements.fullReport) {
    return (
      <UpgradePanel
        feature="path-certificate"
        body="Partner-ready path certificates are part of HōMI Plus — printable proof of readiness posture for education with advisors or partners."
        minTier="plus"
      />
    );
  }

  const [{ data: assessmentData }, { data: profileData }] = await Promise.all([
    supabase.from("assessments").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  const assessment = assessmentData as AssessmentRow | null;
  const profile = profileData as Profile | null;
  if (!assessment) notFound();

  const verdict = assessment.verdict ?? "NOT_YET";
  const meta = VERDICT_META[verdict];
  const completedAt = assessment.completed_at
    ? new Date(assessment.completed_at)
    : new Date(assessment.created_at);
  const holderName = profile?.full_name || "HōMI Member";
  const certId = `PATH-${assessment.id.replace(/-/g, "").slice(0, 12)}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16 print:max-w-full print:px-8 print:py-8">
      <div className="flex items-center justify-between border-b border-slate-surface/60 pb-6 print:border-black/20">
        <div className="flex items-center gap-3">
          <Wordmark size="text-2xl" />
          <span className="text-sm text-dim print:text-black/60">
            Path to Ready Certificate
          </span>
        </div>
        <CredentialPrintButton />
      </div>

      <div className="mt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dim">
          Decision readiness posture
        </p>
        <h1 className="mt-3 font-display text-3xl text-light print:text-black">
          {holderName}
        </h1>
        <p className="mt-2 score-numeral text-5xl text-cyan print:text-black">
          {assessment.overall_score ?? "—"}
        </p>
        <div className="mt-4 flex justify-center">
          <VerdictBadge verdict={verdict} size="lg" />
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm text-dim print:text-black/70">
          {meta.line}
        </p>
      </div>

      <div className="glass mt-10 space-y-3 p-6 print:border print:border-black/20 print:bg-white">
        <p className="text-sm text-light print:text-black">
          <span className="text-dim print:text-black/60">Certificate ID:</span>{" "}
          {certId}
        </p>
        <p className="text-sm text-light print:text-black">
          <span className="text-dim print:text-black/60">Assessment date:</span>{" "}
          {completedAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <p className="text-sm text-light print:text-black">
          <span className="text-dim print:text-black/60">Product path:</span>{" "}
          Path to Ready is the sequenced protective plan after this verdict.
          Partners may review educational posture — not underwriting.
        </p>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-dim print:text-black/60">
        {CERTIFICATE_LEGAL}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-dim print:text-black/60">
        {HOUSEHOLD_LEGAL_SHORT}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-dim print:text-black/60">
        {LEGAL_DISCLAIMER}
      </p>

      <div className="mt-8 flex flex-wrap gap-3 print:hidden">
        <Link href={`/report/${id}/credential`} className="btn btn-ghost btn-sm">
          Classic credential
        </Link>
        <Link href="/path" className="btn btn-primary btn-sm">
          Open Path to Ready
        </Link>
        <Link href="/household" className="btn btn-ghost btn-sm">
          Household dual score
        </Link>
      </div>
    </div>
  );
}
