import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PILLARS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreHistory, type ScoreHistoryPoint } from "@/components/dashboard/ScoreHistory";
import { ScoreDeltaBadge } from "@/components/dashboard/ScoreDeltaBadge";
import { DailyPulseStrip } from "@/components/dashboard/DailyPulseStrip";
import { QuickActionGrid } from "@/components/dashboard/QuickActionGrid";
import { OutcomeSurveyPrompt } from "@/components/dashboard/OutcomeSurveyPrompt";
import type { AssessmentRow, DailyCheckin, OutcomeSurvey, Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Dashboard | HōMI",
  description: "Your decision readiness at a glance — score history, daily pulse, and quick actions.",
};

function firstName(profile: Profile | null, fallbackEmail: string | null): string {
  if (profile?.full_name) return profile.full_name.split(" ")[0];
  if (fallbackEmail) return fallbackEmail.split("@")[0];
  return "there";
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: assessments }, { data: checkins }, { count: journalCount }, { data: dueSurveys }] =
    await Promise.all([
      user
        ? supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null as Profile | null }),
      user
        ? supabase
            .from("assessments")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] as AssessmentRow[] }),
      user
        ? supabase
            .from("daily_checkins")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(14)
        : Promise.resolve({ data: [] as DailyCheckin[] }),
      user
        ? supabase
            .from("decision_journal")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
        : Promise.resolve({ count: 0 }),
      user
        ? supabase
            .from("outcome_surveys")
            .select("*")
            .eq("user_id", user.id)
            .is("completed_at", null)
            .lt("due_at", new Date().toISOString())
            .order("due_at", { ascending: true })
            .limit(1)
        : Promise.resolve({ data: [] as OutcomeSurvey[] }),
    ]);

  const assessmentRows: AssessmentRow[] = assessments ?? [];
  const checkinRows: DailyCheckin[] = checkins ?? [];
  const latest = assessmentRows[0] ?? null;
  const dueSurvey: OutcomeSurvey | null = dueSurveys?.[0] ?? null;

  const name = firstName(profile ?? null, user?.email ?? null);
  const since = daysSince(latest?.completed_at ?? latest?.created_at ?? null);
  const showNudge = since !== null && since > 30;

  const historyPoints: ScoreHistoryPoint[] = [...assessmentRows]
    .reverse()
    .filter((a) => a.overall_score !== null && a.verdict !== null)
    .map((a) => ({
      score: Math.round(a.overall_score as number),
      verdict: a.verdict as VerdictKey,
      date: a.completed_at ?? a.created_at,
    }));

  const previousAssessment = assessmentRows[1] ?? null;
  const scoreDelta =
    latest && previousAssessment && latest.overall_score !== null && previousAssessment.overall_score !== null
      ? {
          current: Math.round(latest.overall_score),
          previous: Math.round(previousAssessment.overall_score),
          previousDate: previousAssessment.completed_at ?? previousAssessment.created_at,
        }
      : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl text-light">
        Welcome back, <span className="text-aurora">{name}</span>
      </h1>
      <p className="mt-2 text-dim">Here is where your decision stands today.</p>

      {/* Hero card */}
      <div className="glass mt-8 grid gap-8 p-8 md:grid-cols-[auto_1fr] md:items-center">
        {latest ? (
          <>
            <div className="flex justify-center">
              <ThresholdCompass size={160} verdict={(latest.verdict as VerdictKey) ?? undefined} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="score-numeral text-5xl font-bold text-light">
                  {Math.round(latest.overall_score ?? 0)}
                </span>
                {latest.verdict && <VerdictBadge verdict={latest.verdict as VerdictKey} size="lg" />}
              </div>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">
                {VERDICT_META[(latest.verdict as VerdictKey) ?? "BUILD_FIRST"].line}
              </p>
              {showNudge && (
                <p className="mt-3 rounded-lg border border-amber/30 bg-verdict-build px-4 py-2 text-sm text-light">
                  It has been {since} days since your last assessment. Life changes — a lot can shift in
                  that time. Consider a retest.
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/assessment" className="btn btn-primary">
                  Retake full assessment
                </Link>
                <Link href="/plan" className="btn btn-ghost">
                  View your plan
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="md:col-span-2">
            <EmptyState preset="dashboard" />
          </div>
        )}
      </div>

      {dueSurvey && <OutcomeSurveyPrompt surveyId={dueSurvey.id} kind={dueSurvey.kind} />}

      {/* Score history */}
      <div className="glass mt-8 p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-light">Score history</h2>
            <p className="mt-1 text-sm text-dim">Your HōMI-Score over time, colored by verdict.</p>
          </div>
          {scoreDelta && (
            <ScoreDeltaBadge
              current={scoreDelta.current}
              previous={scoreDelta.previous}
              previousDate={scoreDelta.previousDate}
            />
          )}
        </div>
        <div className="mt-6">
          <ScoreHistory points={historyPoints} />
        </div>
      </div>

      {/* Pillar cards */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {PILLARS.map((pillar) => {
          const scoreKey =
            pillar.key === "financial"
              ? "financial_score"
              : pillar.key === "emotional"
                ? "emotional_score"
                : "timing_score";
          const value = latest ? Math.round((latest[scoreKey] as number | null) ?? 0) : 0;
          const pct = Math.max(0, Math.min(100, (value / pillar.max) * 100));
          return (
            <div key={pillar.key} className="glass glass-hover p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-light">{pillar.name}</h3>
                <span className="score-numeral text-sm text-dim">
                  {value}/{pillar.max}
                </span>
              </div>
              <p className="mt-1 text-xs text-dim">{pillar.question}</p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: pillar.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily pulse */}
      <div className="glass mt-8 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-light">Daily pulse</h2>
            <p className="mt-1 text-sm text-dim">Mood and stress trend from your last check-ins.</p>
          </div>
          <Link href="/daily" className="btn btn-ghost !px-4 !py-2 text-sm">
            Check in today
          </Link>
        </div>
        <div className="mt-6">
          <DailyPulseStrip checkins={checkinRows} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-light">Quick actions</h2>
        <QuickActionGrid journalCount={journalCount ?? 0} />
      </div>
    </div>
  );
}
