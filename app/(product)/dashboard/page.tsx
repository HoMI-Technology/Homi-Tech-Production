import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PILLARS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Sparkline } from "@/components/ui/Sparkline";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
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

/** Curated next step per weakest pillar — honest guidance, no invented numbers. */
const NEXT_MOVES: Record<
  (typeof PILLARS)[number]["key"],
  { title: string; body: string; href: string; cta: string; secondary: { href: string; label: string } }
> = {
  financial: {
    title: "Strengthen your financial reality",
    body: "Your numbers are the softest of the three pillars right now. Run them honestly — the calculators show exactly which lever moves your score.",
    href: "/tools",
    cta: "Open the finance tools",
    secondary: { href: "/plan", label: "See your plan" },
  },
  emotional: {
    title: "Get honest about the want",
    body: "The math may work, but the why is undercooked. Talk it through with the Companion or write the decision down — clarity moves this pillar.",
    href: "/advisor",
    cta: "Talk to the Companion",
    secondary: { href: "/journal", label: "Open your journal" },
  },
  timing: {
    title: "Read the timing signals",
    body: "You're close on money and motive — the moment is the question. Check the signals shaping your window before you move.",
    href: "/signals",
    cta: "View timing signals",
    secondary: { href: "/plan", label: "See your plan" },
  },
};

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
  const verdict = (latest?.verdict as VerdictKey | null) ?? null;
  const verdictMeta = VERDICT_META[verdict ?? "BUILD_FIRST"];

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

  // Pillar readings from the latest assessment (0 when none yet).
  const pillarReadings = PILLARS.map((pillar) => {
    const scoreKey =
      pillar.key === "financial"
        ? "financial_score"
        : pillar.key === "emotional"
          ? "emotional_score"
          : "timing_score";
    const value = latest ? Math.round((latest[scoreKey] as number | null) ?? 0) : 0;
    return { ...pillar, value, pct: value / pillar.max };
  });
  const strongest = latest ? [...pillarReadings].sort((a, b) => b.pct - a.pct)[0] : null;
  const weakest = latest ? [...pillarReadings].sort((a, b) => a.pct - b.pct)[0] : null;
  const nextMove = weakest ? NEXT_MOVES[weakest.key] : null;

  // Check-ins in the last 7 days — a real cadence number, not an invented streak.
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const checkinsThisWeek = checkinRows.filter((c) => new Date(c.created_at).getTime() >= weekAgo).length;

  const deltaTone =
    scoreDelta === null ? "flat" : scoreDelta.current > scoreDelta.previous ? "up" : scoreDelta.current < scoreDelta.previous ? "down" : "flat";

  return (
    <div className="field">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* ── Header ──────────────────────────────────────────── */}
        <Reveal>
          <p className="eyebrow">Decision readiness</p>
          <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">
            Welcome back, <span className="text-aurora">{name}</span>
          </h1>
          <p className="mt-2 text-dim">
            {latest
              ? `Here is where your decision stands today${since !== null && since > 0 ? ` — last measured ${since} day${since === 1 ? "" : "s"} ago` : ""}.`
              : "Here is where your decision stands today."}
          </p>
        </Reveal>

        {/* ── Stat rail ───────────────────────────────────────── */}
        {latest && (
          <Reveal delay={80}>
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile
                label="HōMI-Score"
                value={String(Math.round(latest.overall_score ?? 0))}
                unit="/100"
                accent={verdictMeta.color}
                delta={
                  scoreDelta
                    ? `${scoreDelta.current - scoreDelta.previous >= 0 ? "+" : ""}${scoreDelta.current - scoreDelta.previous}`
                    : undefined
                }
                deltaTone={deltaTone}
                footer={scoreDelta ? "vs. previous assessment" : verdictMeta.label}
                spark={
                  historyPoints.length >= 2 ? (
                    <Sparkline id="score" values={historyPoints.map((p) => p.score)} color={verdictMeta.color} />
                  ) : undefined
                }
              />
              <StatTile
                label="Strongest pillar"
                value={strongest ? `${strongest.value}` : "—"}
                unit={strongest ? `/${strongest.max}` : undefined}
                accent={strongest?.color}
                footer={strongest?.name}
              />
              <StatTile
                label="Check-ins this week"
                value={String(checkinsThisWeek)}
                unit="/7"
                accent="#34d399"
                footer={checkinRows.length > 0 ? `${checkinRows.length} in the last 14 logged` : "Start a daily pulse"}
              />
              <StatTile
                label="Journal entries"
                value={String(journalCount ?? 0)}
                accent="#facc15"
                footer="Decisions logged"
              />
            </div>
          </Reveal>
        )}

        {/* ── Hero: the verdict instrument ────────────────────── */}
        <Reveal delay={140}>
          <div className="glass sweep relative mt-8 overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full"
              style={{
                background: `radial-gradient(circle, ${verdictMeta.color}1f, transparent 70%)`,
                filter: "blur(20px)",
              }}
            />
            <div className="relative grid gap-8 p-8 md:grid-cols-[auto_1fr] md:items-center">
              {latest ? (
                <>
                  <div className="flex justify-center">
                    <ThresholdCompass size={170} verdict={verdict ?? undefined} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-4">
                      <span
                        className="score-numeral text-6xl font-bold text-light"
                        style={{ textShadow: `0 0 44px ${verdictMeta.color}55` }}
                      >
                        {Math.round(latest.overall_score ?? 0)}
                      </span>
                      {verdict && <VerdictBadge verdict={verdict} size="lg" />}
                    </div>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">{verdictMeta.line}</p>
                    <div className="mt-5 max-w-xl">
                      <div className="relative">
                        <div className="spectrum-bar" />
                        <span
                          aria-hidden
                          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-navy bg-light"
                          style={{
                            left: `${Math.max(2, Math.min(98, Math.round(latest.overall_score ?? 0)))}%`,
                            boxShadow: `0 0 12px ${verdictMeta.color}`,
                          }}
                        />
                      </div>
                      <div className="relative mt-2 h-4 text-[0.6875rem] text-dim">
                        <span className="absolute -translate-x-1/2" style={{ left: "25%" }}>Not yet</span>
                        <span className="absolute -translate-x-1/2" style={{ left: "57%" }}>Build first</span>
                        <span className="absolute -translate-x-1/2" style={{ left: "72%" }}>Almost there</span>
                        <span className="absolute -translate-x-1/2" style={{ left: "90%" }}>Ready</span>
                      </div>
                    </div>
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
          </div>
        </Reveal>

        {dueSurvey && <OutcomeSurveyPrompt surveyId={dueSurvey.id} kind={dueSurvey.kind} />}

        {/* ── History + next best move ────────────────────────── */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Reveal delay={80} className="glass p-8">
            <SectionHeader
              eyebrow="Trajectory"
              title="Score history"
              subtitle="Your HōMI-Score over time, colored by verdict."
              action={
                scoreDelta ? (
                  <ScoreDeltaBadge
                    current={scoreDelta.current}
                    previous={scoreDelta.previous}
                    previousDate={scoreDelta.previousDate}
                  />
                ) : undefined
              }
            />
            <div className="mt-6">
              <ScoreHistory points={historyPoints} />
            </div>
          </Reveal>

          {nextMove && weakest ? (
            <Reveal delay={160} className="glass panel-focus flex flex-col p-8">
              <SectionHeader eyebrow="Next best move" title={nextMove.title} />
              <p className="mt-3 text-sm leading-relaxed text-dim">{nextMove.body}</p>
              <div className="mt-4">
                <span className="chip">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: weakest.color }} />
                  {weakest.name} · {weakest.value}/{weakest.max}
                </span>
              </div>
              <div className="mt-auto flex flex-wrap gap-3 pt-6">
                <Link href={nextMove.href} className="btn btn-primary !px-4 !py-2 text-sm">
                  {nextMove.cta}
                </Link>
                <Link href={nextMove.secondary.href} className="btn btn-ghost !px-4 !py-2 text-sm">
                  {nextMove.secondary.label}
                </Link>
              </div>
            </Reveal>
          ) : (
            <Reveal delay={160} className="glass flex flex-col items-start justify-center p-8">
              <SectionHeader
                eyebrow="Next best move"
                title="Take your first assessment"
                subtitle="Twenty minutes of honesty. Three pillars. One verdict."
              />
              <Link href="/assessment" className="btn btn-primary mt-6 !px-4 !py-2 text-sm">
                Start the assessment
              </Link>
            </Reveal>
          )}
        </div>

        {/* ── Pillars ─────────────────────────────────────────── */}
        <Reveal delay={100}>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {pillarReadings.map((pillar) => {
              const isFocus = latest !== null && weakest !== null && pillar.key === weakest.key;
              return (
                <div key={pillar.key} className={`glass glass-hover sweep relative overflow-hidden p-6 ${isFocus ? "panel-focus" : ""}`}>
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${pillar.color}88, transparent)` }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-light">{pillar.name}</h3>
                      <p className="mt-1 text-xs text-dim">{pillar.question}</p>
                    </div>
                    {isFocus && <span className="chip !text-[0.6875rem]">Focus here</span>}
                  </div>
                  <div className="mt-5 flex justify-center">
                    <ScoreRing value={pillar.value} max={pillar.max} size={120} color={pillar.color} sublabel={`of ${pillar.max}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>

        {/* ── Daily pulse ─────────────────────────────────────── */}
        <Reveal delay={80} className="glass mt-8 block p-8">
          <SectionHeader
            eyebrow="Cadence"
            title="Daily pulse"
            subtitle="Mood and stress trend from your last check-ins."
            action={
              <Link href="/daily" className="btn btn-ghost !px-4 !py-2 text-sm">
                Check in today
              </Link>
            }
          />
          <div className="mt-6">
            <DailyPulseStrip checkins={checkinRows} />
          </div>
        </Reveal>

        {/* ── Quick actions ───────────────────────────────────── */}
        <Reveal delay={80}>
          <div className="mt-10">
            <SectionHeader eyebrow="Instruments" title="Quick actions" />
            <div className="mt-5">
              <QuickActionGrid journalCount={journalCount ?? 0} />
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
