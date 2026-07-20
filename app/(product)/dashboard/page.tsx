import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import { PILLARS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import {
  dashboardInsight,
  greetingForHour,
  hourInTimezone,
  verdictHeldDays,
  verdictImproved,
  type AssessmentReading,
} from "@/lib/dashboard/insight";
import { checkedInToday, contextualActionHrefs } from "@/lib/dashboard/context-actions";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { CinemaFX } from "@/components/home/CinemaFX";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { Sparkline } from "@/components/ui/Sparkline";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScoreHistory, type ScoreHistoryPoint } from "@/components/dashboard/ScoreHistory";
import { ScoreDeltaBadge } from "@/components/dashboard/ScoreDeltaBadge";
import { DailyPulseStrip } from "@/components/dashboard/DailyPulseStrip";
import { QuickActionGrid } from "@/components/dashboard/QuickActionGrid";
import { OutcomeSurveyPrompt } from "@/components/dashboard/OutcomeSurveyPrompt";
import { EntranceConductor } from "@/components/dashboard/Entrance";
import { ENTRANCE_BOOT_SCRIPT } from "@/components/dashboard/entrance-shared";
import { HeroScore } from "@/components/dashboard/HeroScore";
import { PillarRing } from "@/components/dashboard/PillarRing";
import { LoadErrorPanel } from "@/components/dashboard/LoadErrorPanel";
import { VerdictCelebrate } from "@/components/dashboard/VerdictCelebrate";
import {
  FinancialPositionSection,
  FinancialPositionSkeleton,
} from "@/components/dashboard/FinancialPositionSection";
import { GenomeWidget } from "@/components/dashboard/GenomeWidget";
import { TrinityGapAlert } from "@/components/dashboard/TrinityGapAlert";
import { DecisionTimeline } from "@/components/dashboard/DecisionTimeline";
import type {
  AssessmentRow,
  BehavioralGenome,
  DailyCheckin,
  JournalEntry,
  OutcomeSurvey,
  Profile,
} from "@/types/database";

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

function toReading(row: AssessmentRow | null): AssessmentReading | null {
  if (!row) return null;
  return {
    overall_score: row.overall_score,
    verdict: row.verdict,
    financial_score: row.financial_score,
    emotional_score: row.emotional_score,
    timing_score: row.timing_score,
    date: row.completed_at ?? row.created_at,
  };
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
  const user = await getCachedUser();
  const supabase = await getCachedClient();
  const requestHeaders = await headers();
  const timeZone = requestHeaders.get("x-vercel-ip-timezone");

  // Shell queries only — everything the greeting, verdict hero, trajectory,
  // pillars, pulse, and actions need. The money section streams separately
  // behind Suspense (FinancialPositionSection) so Plaid-derived data never
  // blocks first paint.
  const [profileR, assessmentsR, checkinsR, journalR, surveysR, genomeR, journalEntriesR] =
    await Promise.all([
      user
        ? supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null as Profile | null, error: null }),
      user
        ? supabase
            .from("assessments")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] as AssessmentRow[], error: null }),
      user
        ? supabase
            .from("daily_checkins")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(14)
        : Promise.resolve({ data: [] as DailyCheckin[], error: null }),
      user
        ? supabase
            .from("decision_journal")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
        : Promise.resolve({ count: 0, error: null }),
      user
        ? supabase
            .from("outcome_surveys")
            .select("*")
            .eq("user_id", user.id)
            .is("completed_at", null)
            .lt("due_at", new Date().toISOString())
            .order("due_at", { ascending: true })
            .limit(1)
        : Promise.resolve({ data: [] as OutcomeSurvey[], error: null }),
      user
        ? supabase
            .from("behavioral_genome")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null as BehavioralGenome | null, error: null }),
      user
        ? supabase
            .from("decision_journal")
            .select("id, title, context, decision_date, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(8)
        : Promise.resolve({
            data: [] as Pick<JournalEntry, "id" | "title" | "context" | "decision_date" | "created_at">[],
            error: null,
          }),
    ]);

  // Empty and failed are different truths. A transient error must never render
  // first-run copy to a user who has real history.
  const assessmentsFailed = Boolean(user && assessmentsR.error);
  const checkinsFailed = Boolean(user && checkinsR.error);

  const profile = profileR.data ?? null;
  const assessmentRows: AssessmentRow[] = assessmentsR.data ?? [];
  const checkinRows: DailyCheckin[] = checkinsR.data ?? [];
  const journalCount = journalR.count ?? 0;
  const latest = assessmentRows[0] ?? null;
  const previousAssessment = assessmentRows[1] ?? null;
  const dueSurvey: OutcomeSurvey | null = surveysR.data?.[0] ?? null;
  const genome = (genomeR.data as BehavioralGenome | null) ?? null;
  const journalEntries =
    (journalEntriesR.data as Pick<
      JournalEntry,
      "id" | "title" | "context" | "decision_date" | "created_at"
    >[] | null) ?? [];

  const name = firstName(profile, user?.email ?? null);
  const greeting = greetingForHour(hourInTimezone(timeZone));
  const since = daysSince(latest?.completed_at ?? latest?.created_at ?? null);
  const showNudge = since !== null && since > 30;
  const verdict = (latest?.verdict as VerdictKey | null) ?? null;
  const verdictMeta = VERDICT_META[verdict ?? "BUILD_FIRST"];
  const improved = verdictImproved(latest?.verdict ?? null, previousAssessment?.verdict ?? null);

  const historyPoints: ScoreHistoryPoint[] = [...assessmentRows]
    .reverse()
    .filter((a) => a.overall_score !== null && a.verdict !== null)
    .map((a) => ({
      score: Math.round(a.overall_score as number),
      verdict: a.verdict as VerdictKey,
      date: a.completed_at ?? a.created_at,
    }));

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

  // One true sentence about where the user stands (rule-based, never invented).
  const insight = dashboardInsight({
    latest: toReading(latest),
    previous: toReading(previousAssessment),
    checkinsThisWeek,
  });
  const subtitle =
    insight ??
    (latest
      ? `Here is where your decision stands today${since !== null && since > 0 ? ` — last measured ${since} day${since === 1 ? "" : "s"} ago` : ""}.`
      : "Here is where your decision stands today.");

  const heldDays = verdictHeldDays(
    assessmentRows.map((a) => ({ verdict: a.verdict, date: a.completed_at ?? a.created_at })),
  );

  const featured = assessmentsFailed
    ? []
    : contextualActionHrefs({
        hasAssessment: latest !== null,
        weakestPillar: weakest?.key ?? null,
        checkedInToday: checkedInToday(checkinRows[0]?.created_at ?? null),
      });

  return (
    <div
      id="dash-root"
      className="field"
      style={verdict ? ({ "--field-tint": `${verdictMeta.color}12` } as React.CSSProperties) : undefined}
    >
      {/* Pre-paint entrance gate — see entrance-shared.ts. Must be inside the
          container and before the stages so the attribute lands before paint. */}
      <script dangerouslySetInnerHTML={{ __html: ENTRANCE_BOOT_SCRIPT }} />
      <EntranceConductor containerId="dash-root" />
      <CinemaFX />

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="dash-stage">
          <p className="eyebrow">Decision readiness</p>
          <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">
            {greeting}, <span className="text-aurora">{name}</span>
          </h1>
          <p className="mt-2 text-dim">{subtitle}</p>
        </div>

        {/* ── Stat rail ───────────────────────────────────────── */}
        {latest && (
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              <StatTile
                key="verdict"
                label="Verdict held"
                value={heldDays !== null ? String(heldDays) : "—"}
                unit={heldDays !== null ? (heldDays === 1 ? "day" : "days") : undefined}
                accent={verdictMeta.color}
                footer={verdictMeta.label}
                spark={
                  historyPoints.length >= 2 ? (
                    <Sparkline id="score" values={historyPoints.map((p) => p.score)} color={verdictMeta.color} />
                  ) : undefined
                }
              />,
              <StatTile
                key="strongest"
                label="Strongest pillar"
                value={strongest ? `${strongest.value}` : "—"}
                unit={strongest ? `/${strongest.max}` : undefined}
                accent={strongest?.color}
                footer={strongest?.name}
              />,
              <StatTile
                key="checkins"
                label="Check-ins this week"
                value={String(checkinsThisWeek)}
                unit="/7"
                accent="#34d399"
                footer={checkinRows.length > 0 ? `${checkinRows.length} in the last 14 logged` : "Start a daily pulse"}
              />,
              <StatTile
                key="journal"
                label="Journal entries"
                value={String(journalCount)}
                accent="#facc15"
                footer="Decisions logged"
              />,
            ].map((tile, i) => (
              <div
                key={i}
                className="dash-stage"
                style={{ "--stage-delay": `${140 + i * 70}ms` } as React.CSSProperties}
              >
                {tile}
              </div>
            ))}
          </div>
        )}

        {/* ── Hero: the verdict instrument ────────────────────── */}
        <div className="dash-stage" style={{ "--stage-delay": "420ms" } as React.CSSProperties}>
          <div className="glass sweep tilt-3d relative mt-8 overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full"
              style={{
                background: `radial-gradient(circle, ${verdictMeta.color}1f, transparent 70%)`,
                filter: "blur(20px)",
              }}
            />
            {latest && (
              <VerdictCelebrate assessmentId={latest.id} improved={improved} label={verdictMeta.label} />
            )}
            <div className="relative grid gap-8 p-8 md:grid-cols-[auto_1fr] md:items-center">
              {assessmentsFailed ? (
                <div className="md:col-span-2">
                  <LoadErrorPanel
                    title="Your readiness didn't load"
                    body="Your assessments are safe — this is a loading hiccup on our side, not a change in your data."
                  />
                </div>
              ) : latest ? (
                <>
                  <div className="flex justify-center">
                    <ThresholdCompass size={170} verdict={verdict ?? undefined} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-4">
                      <HeroScore value={Math.round(latest.overall_score ?? 0)} color={verdictMeta.color} />
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
                        {/* Middle band labels collide below ~400px — endpoints carry the scale there. */}
                        <span className="absolute hidden -translate-x-1/2 sm:block" style={{ left: "57%" }}>Build first</span>
                        <span className="absolute hidden -translate-x-1/2 sm:block" style={{ left: "72%" }}>Almost there</span>
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
        </div>

        {dueSurvey && <OutcomeSurveyPrompt surveyId={dueSurvey.id} kind={dueSurvey.kind} />}

        {latest && (
          <TrinityGapAlert
            pillars={pillarReadings.map((p) => ({
              key: p.key,
              name: p.name,
              value: p.value,
            }))}
          />
        )}

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
              {assessmentsFailed ? (
                <LoadErrorPanel compact title="History didn't load" body="Your score history is intact — retry in a moment." />
              ) : (
                <ScoreHistory points={historyPoints} />
              )}
            </div>
          </Reveal>

          {assessmentsFailed ? (
            <Reveal delay={160} className="glass flex flex-col justify-center p-8">
              <LoadErrorPanel compact title="Next move didn't load" body="Retry to see your personalized next step." />
            </Reveal>
          ) : nextMove && weakest ? (
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
                title="Get your first score"
                subtitle="Two minutes for a first read, or the full three-pillar assessment for the real verdict."
              />
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/shadow-score" className="btn btn-primary !px-4 !py-2 text-sm">
                  Get your Shadow Score
                </Link>
                <Link href="/assessment" className="btn btn-ghost !px-4 !py-2 text-sm">
                  Full assessment
                </Link>
              </div>
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
                    <PillarRing value={pillar.value} max={pillar.max} size={120} color={pillar.color} sublabel={`of ${pillar.max}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>

        {/* ── Behavioral Genome ───────────────────────────────── */}
        {genome && (
          <Reveal delay={120}>
            <div className="mt-8">
              <GenomeWidget scores={genome.scores} />
            </div>
          </Reveal>
        )}

        {/* ── Financial position (streams behind Suspense) ────── */}
        {user && (
          <Suspense fallback={<FinancialPositionSkeleton />}>
            <FinancialPositionSection
              userId={user.id}
              subscriptionTier={profile?.subscription_tier ?? null}
            />
          </Suspense>
        )}

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
            {checkinsFailed ? (
              <LoadErrorPanel compact title="Check-ins didn't load" body="Your check-in history is intact — retry in a moment." />
            ) : (
              <DailyPulseStrip checkins={checkinRows} />
            )}
          </div>
        </Reveal>

        {/* ── Decision timeline ───────────────────────────────── */}
        <Reveal delay={100}>
          <div className="mt-8">
            <DecisionTimeline
              assessments={assessmentRows}
              checkins={checkinRows}
              journalEntries={journalEntries}
            />
          </div>
        </Reveal>

        {/* ── Quick actions ───────────────────────────────────── */}
        <Reveal delay={80}>
          <div className="mt-10">
            <SectionHeader
              eyebrow="Instruments"
              title="Quick actions"
              subtitle={featured.length > 0 ? "The three that matter right now, first." : undefined}
            />
            <div className="mt-5">
              <QuickActionGrid journalCount={journalCount} featured={featured} />
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
