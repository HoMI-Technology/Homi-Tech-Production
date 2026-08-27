import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PILLARS, VERDICT_META, LEGAL_DISCLAIMER, type VerdictKey } from "@/lib/brand";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";
import { scoreBand, pillarBand } from "@/lib/receipts";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { VerdictBadge } from "@/components/ui/VerdictBadge";

const FINANCIAL = PILLARS.find((p) => p.key === "financial")!;
const EMOTIONAL = PILLARS.find((p) => p.key === "emotional")!;
const TIMING = PILLARS.find((p) => p.key === "timing")!;

interface SharedAssessment {
  overall_score: number;
  verdict: VerdictKey;
  financial_score: number;
  emotional_score: number;
  timing_score: number;
  is_shadow: boolean;
  completed_at: string;
  shared_by: string;
}

function pct(score: number, max: number): number {
  return Math.max(0, Math.min(100, Math.round((score / max) * 100)));
}

/** Unfurl-safe: never put a numeral or READY gate in OG/title. */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Private HōMI share",
    description: "A private Decision Readiness share. Educational guidance only.",
    robots: { index: false, follow: false },
    openGraph: {
      title: "Private HōMI share",
      description: "This link is private.",
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_assessment", { token });

  const row = (Array.isArray(data) ? data[0] : null) as SharedAssessment | null;

  if (error || !row) {
    notFound();
  }

  const meta = VERDICT_META[row.verdict];
  const band = scoreBand(row.overall_score);
  const pillars = {
    financial: pillarBand(pct(row.financial_score, PILLAR_MAX_POINTS.financial)),
    emotional: pillarBand(pct(row.emotional_score, PILLAR_MAX_POINTS.emotional)),
    timing: pillarBand(pct(row.timing_score, PILLAR_MAX_POINTS.timing)),
  };

  return (
    <>
      <SiteHeader />
      <main id="main" className="main-under-nav min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <div className="glass flex flex-col items-center gap-6 p-8 text-center sm:p-12">
            <p className="text-sm uppercase tracking-widest text-dim">
              {row.shared_by} shared their HōMI readiness
            </p>

            <ThresholdCompass size={200} verdict={row.verdict} />

            <p className="text-sm uppercase tracking-widest text-dim">Decision Readiness</p>
            <p className="text-lg font-medium capitalize text-light">{band} band</p>

            <VerdictBadge verdict={row.verdict} size="lg" />

            <p className="max-w-md text-base text-light">{meta.line}</p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {(
              [
                [FINANCIAL.name, pillars.financial],
                [EMOTIONAL.name, pillars.emotional],
                [TIMING.name, pillars.timing],
              ] as const
            ).map(([name, level]) => (
              <div key={name} className="glass flex flex-col items-center gap-2 p-6">
                <p className="text-sm text-dim">{name}</p>
                <p className="text-base font-medium capitalize text-light">{level}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 border-t border-slate-surface/60 pt-10 text-center">
            <h2 className="font-display text-2xl font-semibold text-light">Know before you leap</h2>
            <p className="max-w-md text-sm text-dim">
              HōMI measures readiness across Financial Reality, Emotional Truth, and Perfect Timing
              — not just whether you can afford it. This page is educational guidance, not a
              consumer report, and is not for credit, employment, housing, or insurance eligibility.
            </p>
            <Link href="/shadow-score" className="btn btn-primary">
              Get your own Decision Readiness read
            </Link>
          </div>

          <div className="mt-10 border-t border-slate-surface/60 pt-6">
            <p className="text-xs leading-relaxed text-dim/80">{LEGAL_DISCLAIMER}</p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
