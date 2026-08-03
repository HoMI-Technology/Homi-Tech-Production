import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { env } from "@/lib/env";
import { VERDICT_META, LEGAL_DISCLAIMER } from "@/lib/brand";
import { Wordmark } from "@/components/brand/Wordmark";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { CredentialPrintButton } from "@/components/assessment/CredentialPrintButton";
import { UpgradePanel } from "@/components/ui/UpgradePanel";
import { getUserEntitlements } from "@/lib/entitlements";
import type { AssessmentRow, Profile } from "@/types/database";

/**
 * Printable HōMI credential — a shareable certificate view of a completed
 * assessment. Distinct from the full /report/[id] page: no pillar tables or
 * next steps, just the holder's name, score, verdict, and a short
 * "guardrails applied" attestation. Same auth/ownership rules as the report.
 */
export default async function ReportCredentialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return signInRedirect(`/report/${id}/credential`);
  }

  const { entitlements } = await getUserEntitlements(supabase);
  if (!entitlements.fullReport) {
    return (
      <UpgradePanel
        feature="readiness-credential"
        body="The printable readiness credential is part of HōMI Plus — your shareable proof of an honest read."
        minTier="plus"
      />
    );
  }

  const [{ data: assessmentData }, { data: profileData }, { data: shareData }] = await Promise.all([
    supabase.from("assessments").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("score_shares")
      .select("share_token, expires_at")
      .eq("assessment_id", id)
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const assessment = assessmentData as AssessmentRow | null;
  const profile = profileData as Profile | null;

  if (!assessment) {
    notFound();
  }

  const verdict = assessment.verdict ?? "NOT_YET";
  const meta = VERDICT_META[verdict];
  const completedAt = assessment.completed_at ? new Date(assessment.completed_at) : new Date(assessment.created_at);
  const holderName = profile?.full_name || "HōMI Member";
  const certId = `CERT-${assessment.id.replace(/-/g, "").slice(0, 12)}`;

  const share = shareData as { share_token: string; expires_at: string | null } | null;
  const shareStillValid = share && (!share.expires_at || new Date(share.expires_at).getTime() > Date.now());
  const shareUrl = shareStillValid ? `${env.NEXT_PUBLIC_SITE_URL}/share/${share.share_token}` : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16 print:max-w-full print:px-8 print:py-8">
      <div className="flex items-center justify-between border-b border-slate-surface/60 pb-6 print:border-black/20">
        <div className="flex items-center gap-3">
          <Wordmark size="text-2xl" />
          <span className="text-sm text-dim print:text-black/60">Decision Readiness Credential</span>
        </div>
        <CredentialPrintButton />
      </div>

      <div className="glass mt-8 flex flex-col items-center gap-6 border border-cyan/20 p-8 text-center print:border print:border-black/20 print:bg-transparent sm:p-12">
        <p className="text-xs uppercase tracking-[0.2em] text-dim print:text-black/60">This certifies that</p>
        <h1 className="font-display text-2xl font-semibold text-light print:text-black sm:text-3xl">{holderName}</h1>
        <p className="max-w-md text-sm leading-relaxed text-dim print:text-black/70">
          completed a HōMI Decision Readiness assessment and received the following honest read.
        </p>

        <div className="mt-2 flex flex-col items-center gap-3">
          <span className="score-numeral text-6xl font-bold text-light print:text-black">
            {assessment.overall_score ?? "—"}
          </span>
          <p className="text-xs uppercase tracking-widest text-dim print:text-black/60">HōMI-Score out of 100</p>
          <VerdictBadge verdict={verdict} size="lg" />
          <p className="mt-1 max-w-sm text-sm text-light print:text-black">{meta.line}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-dim print:text-black/60">
          <span>
            {completedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
          <span className="font-mono">{certId}</span>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold text-light print:text-black">Guardrails applied</h2>
        <ul className="mt-4 flex flex-col gap-3">
          <GuardrailLine text="Deterministic scoring — computed by code, not improvised." />
          <GuardrailLine text="Hard-stop protections evaluated." />
          <GuardrailLine text="Honest verdict — never adjusted to please." />
        </ul>
      </div>

      {shareUrl && (
        <div className="mt-10 print:hidden">
          <h2 className="font-display text-lg font-semibold text-light">Share link</h2>
          <p className="mt-2 break-all text-sm text-dim">{shareUrl}</p>
        </div>
      )}

      <div className="mt-12 border-t border-slate-surface/60 pt-6 print:border-black/20">
        <p className="font-mono text-xs text-dim/80 print:text-black/60">
          Score computed by deterministic code · Verdict bands 80/65/50 published
        </p>
        <p className="mt-4 text-xs leading-relaxed text-dim/80 print:text-black/60">{LEGAL_DISCLAIMER}</p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 print:hidden">
        <Link href={`/report/${assessment.id}`} className="btn btn-ghost">
          Back to report
        </Link>
        <Link href={`/report/${assessment.id}/path-certificate`} className="btn btn-ghost">
          Path certificate
        </Link>
      </div>
    </div>
  );
}

function GuardrailLine({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-sm text-light print:text-black">
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald/15 text-xs font-bold text-emerald print:bg-transparent print:text-black print:border print:border-black/40"
      >
        &#10003;
      </span>
      {text}
    </li>
  );
}
