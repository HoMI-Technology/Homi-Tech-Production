import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import { COLORS, PILLARS, VERDICT_META, type VerdictKey } from "@/lib/brand";
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
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { Reveal } from "@/components/ui/Reveal";
import { ScoreHistory, type ScoreHistoryPoint } from "@/components/dashboard/ScoreHistory";
import { ScoreDeltaBadge } from "@/components/dashboard/ScoreDeltaBadge";
import { QuickActionGrid } from "@/components/dashboard/QuickActionGrid";
import { OutcomeSurveyPrompt } from "@/components/dashboard/OutcomeSurveyPrompt";
import { EntranceConductor } from "@/components/dashboard/Entrance";
import { ENTRANCE_BOOT_SCRIPT } from "@/components/dashboard/entrance-shared";
import { HeroScore } from "@/components/dashboard/HeroScore";
import { PillarRing } from "@/components/dashboard/PillarRing";
import { LoadErrorPanel } from "@/components/dashboard/LoadErrorPanel";
import { VerdictCelebrate } from "@/components/dashboard/VerdictCelebrate";
import { SidebarVerdictSync } from "@/components/dashboard/SidebarVerdictSync";
import {
  FinancialPositionSection,
  FinancialPositionSkeleton,
} from "@/components/dashboard/FinancialPositionSection";
import { DecisionTimeline } from "@/components/dashboard/DecisionTimeline";
import { PathNextMove } from "@/components/dashboard/PathNextMove";
import { DashboardResumeRamp } from "@/components/dashboard/DashboardResumeRamp";
import { DashboardFoldBeacon } from "@/components/dashboard/DashboardFoldBeacon";
import { DashSpectrum } from "@/components/dashboard/DashSpectrum";
import {
  buildProgressLabel,
  companionFoldLine,
  hardStopMessages,
  shouldPaintDashSpectrum,
  shouldSuppressBuildPercent,
} from "@/lib/dashboard/fold-truth";
import { PageFrame } from "@/components/operate/PageFrame";
import { MetricRail } from "@/components/operate/MetricRail";
import { ActionDock } from "@/components/operate/ActionDock";
import { OperateHeroMeta } from "@/components/operate/OperateHeroMeta";
import { OperateInstrument } from "@/components/operate/OperateInstrument";
import type {
  AssessmentRow,
  DailyCheckin,
  JournalEntry,
  OutcomeSurvey,
  Profile,
} from "@/types/database";

export const metadata: Metadata = {
  title: "Dashboard | HōMI",
  description: "Your decision readiness at a glance — score history and next moves.",
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
  {
    title: string;
    body: string;
    href: string;
    cta: string;
    secondary: { href: string; label: string };
  }
> = {
  financial: {
    title: "Strengthen your financial reality",
    body: "Your numbers are the softest of the three pillars right now. Open Money — stress the decision against your real picture, not a calculator mall.",
    href: "/money/decide",
    cta: "Open Money · Decide",
    secondary: { href: "/money", label: "See your money picture" },
  },
  emotional: {
    title: "Get honest about the want",
    body: "The math may work, but the why is undercooked. Write the decision down — clarity moves this pillar.",
    href: "/journal",
    cta: "Open your journal",
    secondary: { href: "/path", label: "Open Path to Ready" },
  },
  timing: {
    title: "Work the timing constraint",
    body: "You're close on money and motive — the moment is the question. Open Path and work the binding constraint before you move.",
    href: "/path",
    cta: "Open Path to Ready",
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
  const [profileR, assessmentsR, checkinsR, journalR, surveysR, journalEntriesR, pathR] =
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
            .from("decision_journal")
            .select("id, title, context, decision_date, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(8)
        : Promise.resolve({
            data: [] as Pick<
              JournalEntry,
              "id" | "title" | "context" | "decision_date" | "created_at"
            >[],
            error: null,
          }),
      user
        ? supabase
            .from("user_readiness_path")
            .select("path")
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null as { path: unknown } | null, error: null }),
    ]);

  // Empty and failed are different truths. A transient error must never render
  // first-run copy to a user who has real history.
  const assessmentsFailed = Boolean(user && assessmentsR.error);

  const profile = profileR.data ?? null;
  const assessmentRows: AssessmentRow[] = assessmentsR.data ?? [];
  const checkinRows: DailyCheckin[] = checkinsR.data ?? [];
  const journalCount = journalR.count ?? 0;
  const latest = assessmentRows[0] ?? null;
  const stopMessages = hardStopMessages(latest?.hard_stops);
  const hardStopCount = stopMessages.length;
  const suppressBuildPercent = shouldSuppressBuildPercent(hardStopCount);
  const pathPayload =
    pathR.error || !pathR.data ? null : (pathR.data as { path?: { steps?: unknown } }).path;
  const pathSteps = Array.isArray(pathPayload?.steps) ? pathPayload.steps : [];
  const pathDone = pathSteps.filter((step) => {
    if (!step || typeof step !== "object") return false;
    const status = (step as { status?: unknown }).status;
    return status === "done" || status === "skipped";
  }).length;
  const progressLabel = buildProgressLabel({
    done: pathDone,
    total: pathSteps.length,
    hardStopCount,
  });
  const foldLine = companionFoldLine({
    hasHardStops: hardStopCount > 0,
    hasPath: pathSteps.length > 0,
    hasAssessment: latest !== null,
  });
  const previousAssessment = assessmentRows[1] ?? null;
  const dueSurvey: OutcomeSurvey | null = surveysR.data?.[0] ?? null;
  const journalEntries =
    (journalEntriesR.data as
      | Pick<JournalEntry, "id" | "title" | "context" | "decision_date" | "created_at">[]
      | null) ?? [];

  const name = firstName(profile, user?.email ?? null);
  const greeting = greetingForHour(hourInTimezone(timeZone));
  const since = daysSince(latest?.completed_at ?? latest?.created_at ?? null);
  const showNudge = since !== null && since > 30;
  const verdict = (latest?.verdict as VerdictKey | null) ?? null;
  const verdictMeta = VERDICT_META[verdict ?? "BUILD_FIRST"];
  // Non-READY bands: Path is the default habit, not plan/tools.
  const pathIsDefaultHabit =
    verdict === "NOT_YET" || verdict === "BUILD_FIRST" || verdict === "ALMOST_THERE";
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
    latest &&
    previousAssessment &&
    latest.overall_score !== null &&
    previousAssessment.overall_score !== null
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
  const checkinsThisWeek = checkinRows.filter(
    (c) => new Date(c.created_at).getTime() >= weekAgo,
  ).length;

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

  const instrumentTint = verdictMeta.color;
  const scorePct = latest?.overall_score != null ? Math.round(latest.overall_score) : 0;

  const fieldStyle = (
    verdict
      ? {
          "--field-tint": `${verdictMeta.color}14`,
          "--instrument-tint": instrumentTint,
        }
      : { ["--instrument-tint" as string]: COLORS.cyan }
  ) as CSSProperties;

  const dockTitle = showNudge
    ? "Re-measure your readiness"
    : pathIsDefaultHabit
      ? "Work the binding constraint on your path"
      : nextMove
        ? nextMove.title
        : "Open your plan";

  return (
    <PageFrame
      id="dash-root"
      role="personal"
      density="compact"
      style={fieldStyle}
    >
      <script dangerouslySetInnerHTML={{ __html: ENTRANCE_BOOT_SCRIPT }} />
      <DashboardFoldBeacon
        hasAssessment={latest ? 1 : 0}
        hardStopCount={hardStopCount}
        hasPath={pathSteps.length > 0 ? 1 : 0}
      />
      <EntranceConductor containerId="dash-root" />
      <SidebarVerdictSync
        verdict={verdict}
        score={latest?.overall_score ?? null}
        decisionType={latest?.decision_type ?? null}
      />

      {/* ── Single fold instrument: greeting + score + next move ── */}
      <div className="dash-stage">
        <OperateInstrument tint={instrumentTint}>
          {latest && !suppressBuildPercent && (
            <VerdictCelebrate
              assessmentId={latest.id}
              improved={improved}
              label={verdictMeta.label}
            />
          )}
          <OperateHeroMeta
            title={
              <>
                {greeting}, <span className="text-aurora">{name}</span>
              </>
            }
            description={subtitle}
          />

          {assessmentsFailed ? (
            <LoadErrorPanel
              title="Your readiness didn't load"
              body="Your assessments are safe - this is a loading hiccup on our side, not a change in your data."
            />
          ) : latest ? (
            <>
              {stopMessages.length > 0 && (
                <div
                  className="mb-5 rounded-xl border border-crimson/45 bg-crimson/10 px-4 py-3"
                  role="alert"
                >
                  <p className="text-3xs font-bold uppercase tracking-[0.14em] text-crimson">
                    Hard stop
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-light">
                    {stopMessages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,140px)_1fr] lg:gap-10">
                <div className="flex justify-center lg:justify-start">
                  <ThresholdCompass size={128} verdict={verdict ?? undefined} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-3xs font-bold uppercase tracking-[0.16em] text-dim">
                      HōMI-Score
                    </p>
                    {scoreDelta && (
                      <ScoreDeltaBadge
                        current={scoreDelta.current}
                        previous={scoreDelta.previous}
                        previousDate={scoreDelta.previousDate}
                      />
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-end gap-3 sm:gap-4">
                    <HeroScore value={scorePct} color={instrumentTint} />
                    {verdict && (
                      <div className="mb-1.5">
                        <VerdictBadge verdict={verdict} size="lg" />
                      </div>
                    )}
                  </div>
                  <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-light/90">
                    {verdictMeta.line}
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">{foldLine}</p>

                  {shouldPaintDashSpectrum(hardStopCount) && (
                    <DashSpectrum
                      scorePct={scorePct}
                      tint={instrumentTint}
                      stopActive={suppressBuildPercent}
                    />
                  )}

                  {showNudge && (
                    <p className="mt-4 rounded-lg border border-amber/35 bg-verdict-build/90 px-4 py-2.5 text-sm text-light">
                      It has been {since} days since your last assessment. Life changes -
                      consider a retest.
                    </p>
                  )}
                </div>
              </div>

              <ActionDock kicker="Next move" title={dockTitle}>
                {showNudge ? (
                  <>
                    <Link href="/assessment" className="btn btn-primary">
                      Retake assessment
                    </Link>
                    {pathIsDefaultHabit ? (
                      <Link href="/path" className="btn btn-ghost">
                        Open path
                      </Link>
                    ) : nextMove ? (
                      <Link href={nextMove.href} className="btn btn-ghost">
                        {nextMove.cta}
                      </Link>
                    ) : (
                      <Link href="/plan" className="btn btn-ghost">
                        View plan
                      </Link>
                    )}
                  </>
                ) : pathIsDefaultHabit ? (
                  <>
                    <Link href="/path" className="btn btn-primary">
                      Open Path to Ready
                    </Link>
                    {nextMove ? (
                      <Link href={nextMove.href} className="btn btn-ghost">
                        {nextMove.cta}
                      </Link>
                    ) : (
                      <Link href="/plan" className="btn btn-ghost">
                        View plan
                      </Link>
                    )}
                  </>
                ) : nextMove ? (
                  <>
                    <Link href={nextMove.href} className="btn btn-primary">
                      {nextMove.cta}
                    </Link>
                    <Link href="/plan" className="btn btn-ghost">
                      View plan
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/plan" className="btn btn-primary">
                      View plan
                    </Link>
                    <Link href="/assessment" className="btn btn-ghost">
                      Retake
                    </Link>
                  </>
                )}
              </ActionDock>
            </>
          ) : (
            <DashboardResumeRamp />
          )}
        </OperateInstrument>
      </div>

      {/* Path to Ready next-move island (localStorage) — null when no path */}
      <PathNextMove />

      {latest && dueSurvey && (
        <div className="mt-5">
          <OutcomeSurveyPrompt surveyId={dueSurvey.id} kind={dueSurvey.kind} />
        </div>
      )}

      {latest && (
        <>
          {/* Metric strip - no kicker, sits under instrument */}
          <div className="dash-stage mt-5" style={{ "--stage-delay": "100ms" } as CSSProperties}>
            <MetricRail
              cells={[
                {
                  label: "Verdict held",
                  value: (
                    <>
                      {heldDays !== null ? heldDays : "—"}
                      {heldDays !== null && (
                        <span className="ml-1 text-sm font-normal text-dim">
                          {heldDays === 1 ? "day" : "days"}
                        </span>
                      )}
                    </>
                  ),
                  footer: verdictMeta.label,
                  color: instrumentTint,
                },
                {
                  label: "Strongest",
                  value: (
                    <>
                      {strongest ? strongest.value : "—"}
                      {strongest && (
                        <span className="ml-1 text-sm font-normal text-dim">/{strongest.max}</span>
                      )}
                    </>
                  ),
                  footer: strongest?.name ?? "—",
                  color: strongest?.color,
                },
                {
                  label: suppressBuildPercent ? "Path" : "Path steps",
                  value: suppressBuildPercent ? "Stop" : (progressLabel ?? "—"),
                  footer: suppressBuildPercent
                    ? "Hard stop first"
                    : progressLabel
                      ? "Current path"
                      : "No path yet",
                  color: suppressBuildPercent ? COLORS.crimson : COLORS.emerald,
                },
                {
                  label: "Journal",
                  value: journalCount,
                  footer: "Decisions logged",
                  color: COLORS.yellow,
                },
              ]}
            />
          </div>

            {/* Body: pillars + history main, pulse/actions side */}
            <div className="dash-body-grid mt-8">
              <div className="min-w-0 space-y-8">
                <Reveal delay={60}>
                  <div>
                    <div className="dash-section-head">
                      <h2>Softest lever first</h2>
                      <p>
                        Financial Reality, Emotional Truth, Perfect Timing. The weak ring owns your
                        next move.
                      </p>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-12">
                      {pillarReadings.map((pillar) => {
                        const isFocus = weakest !== null && pillar.key === weakest.key;
                        return (
                          <div
                            key={pillar.key}
                            className={`glass relative overflow-hidden p-4 sm:p-5 ${
                              isFocus
                                ? "dash-pillar-focus lg:col-span-6"
                                : "dash-pillar-quiet glass-hover lg:col-span-3"
                            }`}
                            style={{ ["--pillar-tint" as string]: pillar.color }}
                          >
                            <span
                              aria-hidden
                              className="absolute inset-x-0 top-0 h-0.5"
                              style={{
                                background: `linear-gradient(90deg, transparent, ${pillar.color}, transparent)`,
                              }}
                            />
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="text-sm font-semibold text-light sm:text-base">
                                  {pillar.name}
                                </h3>
                                <p className="mt-0.5 text-xs text-dim">{pillar.question}</p>
                              </div>
                              {isFocus && (
                                <span className="chip !border-cyan/40 !bg-cyan/10 !text-3xs !text-cyan">
                                  Focus
                                </span>
                              )}
                            </div>
                            <div
                              className={`mt-4 flex ${isFocus ? "justify-start sm:justify-center" : "justify-center"}`}
                            >
                              <PillarRing
                                value={pillar.value}
                                max={pillar.max}
                                size={isFocus ? 128 : 96}
                                color={pillar.color}
                                sublabel={`of ${pillar.max}`}
                              />
                            </div>
                            {isFocus && nextMove && (
                              <div className="mt-4 border-t border-white/10 pt-3">
                                <p className="text-3xs font-bold uppercase tracking-[0.12em] text-cyan">
                                  Why this pillar
                                </p>
                                <p className="mt-1.5 text-sm leading-relaxed text-dim">
                                  {nextMove.body}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Link href={nextMove.href} className="btn btn-primary btn-sm">
                                    {nextMove.cta}
                                  </Link>
                                  <Link
                                    href={nextMove.secondary.href}
                                    className="btn btn-ghost btn-sm"
                                  >
                                    {nextMove.secondary.label}
                                  </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={80} className="block">
                  <div className="glass p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="dash-section-head !mb-0">
                        <h2>Score history</h2>
                        <p>HōMI-Score over time, colored by verdict.</p>
                      </div>
                      {scoreDelta && (
                        <ScoreDeltaBadge
                          current={scoreDelta.current}
                          previous={scoreDelta.previous}
                          previousDate={scoreDelta.previousDate}
                        />
                      )}
                    </div>
                    <div className="mt-5">
                      {assessmentsFailed ? (
                        <LoadErrorPanel
                          compact
                          title="History didn't load"
                          body="Your score history is intact - retry in a moment."
                        />
                      ) : (
                        <ScoreHistory points={historyPoints} />
                      )}
                    </div>
                  </div>
                </Reveal>

                {user && (
                  <div>
                    <Suspense fallback={<FinancialPositionSkeleton />}>
                      <FinancialPositionSection
                        userId={user.id}
                        subscriptionTier={profile?.subscription_tier ?? null}
                      />
                    </Suspense>
                  </div>
                )}

                <Reveal delay={80}>
                  <DecisionTimeline
                    assessments={assessmentRows}
                    checkins={checkinRows}
                    journalEntries={journalEntries}
                  />
                </Reveal>
              </div>

              <aside className="dash-side-stack" aria-label="Cadence">
                <div className="dash-panel">
                  <h3 className="mb-1">Snapshot</h3>
                  <div className="dash-side-metric">
                    <span className="dash-side-metric-label">Held</span>
                    <span className="dash-side-metric-value" style={{ color: instrumentTint }}>
                      {heldDays !== null ? `${heldDays}d` : "—"}
                    </span>
                  </div>
                  <div className="dash-side-metric">
                    <span className="dash-side-metric-label">Strongest</span>
                    <span className="dash-side-metric-value" style={{ color: strongest?.color }}>
                      {strongest ? strongest.value : "—"}
                    </span>
                  </div>
                  <div className="dash-side-metric">
                    <span className="dash-side-metric-label">Pulse · 7d</span>
                    <span className="dash-side-metric-value text-emerald">
                      {checkinsThisWeek}/7
                    </span>
                  </div>
                  <div className="dash-side-metric">
                    <span className="dash-side-metric-label">Journal</span>
                    <span className="dash-side-metric-value text-yellow">{journalCount}</span>
                  </div>
                </div>
              </aside>
            </div>

          <Reveal delay={80}>
            <div className="mt-10 mb-2">
              <div className="dash-section-head">
                <h2>Quick actions</h2>
                {featured.length > 0 && (
                  <p>The instruments that matter for your current state, first.</p>
                )}
              </div>
              <QuickActionGrid journalCount={journalCount} featured={featured} />
            </div>
          </Reveal>
        </>
      )}
    </PageFrame>
  );
}
