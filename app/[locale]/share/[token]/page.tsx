import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILLARS, VERDICT_META, LEGAL_DISCLAIMER, type VerdictKey } from "@/lib/brand";
import { PILLAR_MAX_POINTS } from "@/lib/scoring";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { ScoreRing } from "@/components/ui/ScoreRing";

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

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_assessment", { token });

  const row = (Array.isArray(data) ? data[0] : null) as SharedAssessment | null;

  if (error || !row) {
    notFound();
  }

  const meta = VERDICT_META[row.verdict];

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

            <div>
              <p className="score-numeral text-6xl font-bold text-light">{row.overall_score}</p>
              <p className="mt-1 text-sm uppercase tracking-widest text-dim">HōMI-Score out of 100</p>
            </div>

            <VerdictBadge verdict={row.verdict} size="lg" />

            <p className="max-w-md text-base text-light">{meta.line}</p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="glass flex flex-col items-center gap-4 p-6">
              <ScoreRing
                value={row.financial_score}
                max={PILLAR_MAX_POINTS.financial}
                color={FINANCIAL.color}
                label={FINANCIAL.name}
                size={120}
              />
            </div>
            <div className="glass flex flex-col items-center gap-4 p-6">
              <ScoreRing
                value={row.emotional_score}
                max={PILLAR_MAX_POINTS.emotional}
                color={EMOTIONAL.color}
                label={EMOTIONAL.name}
                size={120}
              />
            </div>
            <div className="glass flex flex-col items-center gap-4 p-6">
              <ScoreRing
                value={row.timing_score}
                max={PILLAR_MAX_POINTS.timing}
                color={TIMING.color}
                label={TIMING.name}
                size={120}
              />
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 border-t border-slate-surface/60 pt-10 text-center">
            <h2 className="font-display text-2xl font-semibold text-light">Know before you leap</h2>
            <p className="max-w-md text-sm text-dim">
              HōMI measures readiness across Financial Reality, Emotional Truth, and Perfect Timing — not just whether you can afford it.
            </p>
            <Link href="/shadow-score" className="btn btn-primary">
              Get your own score
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
