"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sliderFillPercent } from "@/lib/assessment/format";
import { Celebrate } from "@/components/ui/Celebrate";
import { PageFrame } from "@/components/operate/PageFrame";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DailyCheckin } from "@/types/database";

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function computeStreak(checkins: DailyCheckin[]): number {
  if (checkins.length === 0) return 0;
  const days = new Set(checkins.map((c) => new Date(c.created_at).toDateString()));
  let streak = 0;
  const cursor = new Date();
  // If no check-in today yet, streak counts consecutive days ending yesterday.
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Chips: single-select "unplanned spend today". There is no dedicated DB
// column for this — it is folded into the free-text `note` column as a
// tidy, human-readable prefix (see buildNote below) so it round-trips
// through the existing schema with zero backend changes.
const SPEND_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "$0" },
  { value: "under10", label: "Under $10" },
  { value: "25", label: "$25" },
  { value: "50", label: "$50" },
  { value: "100plus", label: "$100+" },
];

const SPEND_LABELS: Record<string, string> = Object.fromEntries(
  SPEND_OPTIONS.map((o) => [o.value, o.label]),
);

// Chips: single-select "today's money win" — also folded into `note`.
const WIN_OPTIONS: { value: string; label: string }[] = [
  { value: "saved", label: "Saved something" },
  { value: "paid_debt", label: "Paid down debt" },
  { value: "said_no", label: "Said no to an impulse" },
  { value: "stuck_to_plan", label: "Stuck to plan" },
  { value: "invested", label: "Invested" },
  { value: "talked_honestly", label: "Talked money honestly" },
];

const WIN_LABELS: Record<string, string> = Object.fromEntries(
  WIN_OPTIONS.map((o) => [o.value, o.label]),
);

/**
 * Folds the spend-check chip + money-win pick into the existing `note`
 * column as a short, human-readable structured prefix, e.g.
 * "[Spend: under $10 · Win: Paid down debt] <user's own note>". Keeps the
 * insert shape identical to the pre-upgrade schema — no migration needed.
 */
function buildNote(spend: string | null, win: string | null, userNote: string): string | null {
  const parts: string[] = [];
  if (spend) parts.push(`Spend: ${SPEND_LABELS[spend]}`);
  if (win) parts.push(`Win: ${WIN_LABELS[win]}`);
  const prefix = parts.length > 0 ? `[${parts.join(" · ")}] ` : "";
  const combined = `${prefix}${userNote}`.trim();
  return combined.length > 0 ? combined : null;
}

/** A calm, varied one-line insight built from the spend + win picks. */
function buildInsight(spend: string | null, win: string | null): string {
  const spendPhrase: Record<string, string> = {
    "0": "You spent nothing unplanned today",
    under10: "You kept today's unplanned spend under ten dollars",
    "25": "Today's unplanned spend landed around twenty-five dollars",
    "50": "Today's unplanned spend landed around fifty dollars",
    "100plus": "Today had a bigger unplanned spend, a hundred dollars or more",
  };
  const winPhrase: Record<string, string> = {
    saved: "and you still found a way to save something",
    paid_debt: "and you still put money toward your debt",
    said_no: "and you still said no to an impulse when it mattered",
    stuck_to_plan: "and you still stuck to your plan",
    invested: "and you still moved money toward your future",
    talked_honestly: "and you still talked about money honestly",
  };

  const spendLine = (spend && spendPhrase[spend]) || "Today had its own shape, spend-wise";
  const winLine = (win && winPhrase[win]) || "and something about it still counted";

  return `${spendLine}, ${winLine}.`;
}

const STEP_TITLES = ["Mood, stress, pressure", "Unplanned spend today", "Today's money win", "Anything else?"];
const TOTAL_STEPS = STEP_TITLES.length;

export default function DailyCheckinPage() {
  const supabase = useMemo(() => createClient(), []);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState(5);
  const [stress, setStress] = useState(5);
  const [pressure, setPressure] = useState(5);
  const [note, setNote] = useState("");
  const [spend, setSpend] = useState<string | null>(null);
  const [win, setWin] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [completed, setCompleted] = useState(false);
  const [insight, setInsight] = useState("");
  const [newStreak, setNewStreak] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!active) return;
      if (fetchError) setError(fetchError.message);
      setCheckins((data as DailyCheckin[]) ?? []);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  const todayCheckin = checkins.find((c) => isToday(c.created_at)) ?? null;
  const last14 = checkins.slice(0, 14);
  const streak = computeStreak(checkins);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sign in to check in.");
      setSubmitting(false);
      return;
    }

    const finalNote = buildNote(spend, win, note);

    const { data, error: insertError } = await supabase
      .from("daily_checkins")
      .insert({
        user_id: user.id,
        mood,
        financial_stress: stress,
        decision_pressure: pressure,
        note: finalNote,
      })
      .select()
      .single();

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    const inserted = data as DailyCheckin;
    const nextCheckins = [inserted, ...checkins];
    setCheckins(nextCheckins);
    setNewStreak(computeStreak(nextCheckins));
    setInsight(buildInsight(spend, win));
    setCompleted(true);
  }

  function goNext() {
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }
  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  const nextDisabled = (step === 1 && !spend) || (step === 2 && !win);

  return (
    <PageFrame width="content" density="spacious" role="personal">
      <h1 className="font-display text-3xl text-light">Daily Check-in</h1>
      <p className="mt-2 max-w-xl text-dim">Sixty seconds. A few honest picks. One snapshot of today.</p>

      {error && (
        <div className="mt-4 rounded-lg border border-crimson/30 bg-verdict-notyet px-4 py-3 text-sm text-light">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="glass p-6">
          {loading ? (
            <div className="space-y-5" aria-busy="true" aria-label="Loading check-in">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="mt-2 h-11 w-full rounded-xl" />
            </div>
          ) : completed ? (
            <CompletionScreen insight={insight} streak={newStreak} />
          ) : todayCheckin ? (
            <div>
              <p className="text-sm font-semibold text-emerald">You already checked in today.</p>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <Stat label="Mood" value={todayCheckin.mood} />
                <Stat label="Financial stress" value={todayCheckin.financial_stress} />
                <Stat label="Decision pressure" value={todayCheckin.decision_pressure} />
              </div>
              {todayCheckin.note && <p className="mt-4 text-sm text-dim">&ldquo;{todayCheckin.note}&rdquo;</p>}
              <p className="mt-4 text-xs text-dim">Come back tomorrow to keep your streak going.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <CountdownRing />
                <div>
                  <p className="text-xs text-dim">
                    Step {step + 1} of {TOTAL_STEPS}
                  </p>
                  <p className="text-sm text-light">{STEP_TITLES[step]}</p>
                </div>
              </div>

              {step === 0 && (
                <div className="space-y-5">
                  <SliderField label="Mood" value={mood} onChange={setMood} lowLabel="Rough" highLabel="Great" />
                  <SliderField label="Financial stress" value={stress} onChange={setStress} lowLabel="Calm" highLabel="Overwhelmed" />
                  <SliderField label="Decision pressure" value={pressure} onChange={setPressure} lowLabel="None" highLabel="Intense" />
                </div>
              )}

              {step === 1 && (
                <div>
                  <p className="text-sm text-light">Any unplanned spend today?</p>
                  <SegmentedControl
                    ariaLabel="Unplanned spend today"
                    options={SPEND_OPTIONS}
                    value={spend}
                    onChange={setSpend}
                    className="mt-3 flex flex-wrap gap-2"
                  />
                </div>
              )}

              {step === 2 && (
                <div>
                  <p className="text-sm text-light">What counted as a money win today?</p>
                  <SegmentedControl
                    ariaLabel="Today's money win"
                    options={WIN_OPTIONS}
                    value={win}
                    onChange={setWin}
                    className="mt-3 flex flex-wrap gap-2"
                  />
                </div>
              )}

              {step === 3 && (
                <div>
                  <label className="text-sm text-light">Note (optional)</label>
                  <textarea
                    className="input mt-2"
                    rows={2}
                    placeholder="Anything on your mind today?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <button className="btn btn-ghost" onClick={goBack} disabled={step === 0}>
                  Back
                </button>
                {step < TOTAL_STEPS - 1 ? (
                  <button className="btn btn-primary" onClick={goNext} disabled={nextDisabled}>
                    Next
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Saving..." : "Check in"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass p-6 text-center">
            <p className="text-xs text-dim">Current streak</p>
            <p className="score-numeral mt-1 text-4xl font-bold text-cyan">{streak}</p>
            <p className="mt-1 text-xs text-dim">day{streak === 1 ? "" : "s"}</p>
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">14-day trend</h2>
            <TrendChart checkins={last14} />
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

function CompletionScreen({ insight, streak }: { insight: string; streak: number }) {
  return (
    <div className="space-y-5 text-center">
      <p className="text-sm font-semibold text-emerald">Logged. Sixty honest seconds, done.</p>
      <p className="text-sm leading-relaxed text-light">{insight}</p>
      {streak >= 3 && (
        <div className="pt-2">
          <Celebrate active label="Three days of honesty. The compass notices." />
        </div>
      )}
      <p className="text-xs text-dim">Come back tomorrow to keep your streak going.</p>
    </div>
  );
}

/**
 * A quiet, ambient 60-second pacing ring — thin cyan stroke, no urgency
 * styling. It does not block or force-advance the user; it simply fills in
 * over 60s and stays complete. Under prefers-reduced-motion the global CSS
 * reduced-motion block collapses the transition to near-instant, so it just
 * renders as a static, already-complete ring — the required static fallback.
 */
function CountdownRing() {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setStarted(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const radius = 24;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 56 56" width={40} height={40} className="shrink-0" role="img" aria-label="A calm sixty second pacing ring for this check-in">
      <circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="2" />
      <circle
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke="#22d3ee"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.75"
        transform="rotate(-90 28 28)"
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: started ? 0 : circumference,
          transition: "stroke-dashoffset 60s linear",
        }}
      />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-dim">{label}</p>
      <p className="score-numeral mt-1 text-lg font-bold text-light">{value}/10</p>
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm text-light">{label}</label>
        <span className="score-numeral text-sm text-cyan">{value}/10</span>
      </div>
      <input
        type="range"
        className="homi-slider mt-2"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${sliderFillPercent(value, 1, 10)}%` }}
      />
      <div className="mt-1 flex justify-between text-xs text-dim">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

function TrendChart({ checkins }: { checkins: DailyCheckin[] }) {
  if (checkins.length === 0) {
    return <p className="mt-4 text-sm text-dim">No check-ins yet — your trend will appear here.</p>;
  }

  const ordered = [...checkins].reverse();
  const width = 480;
  const height = 160;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const pointsFor = (key: "mood" | "financial_stress" | "decision_pressure") =>
    ordered
      .map((c, i) => {
        const x = padding + (ordered.length === 1 ? chartWidth / 2 : (i / (ordered.length - 1)) * chartWidth);
        const y = padding + chartHeight - (c[key] / 10) * chartHeight;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="mt-4" role="img" aria-label="14 day mood, stress, and pressure trend">
        <polyline points={pointsFor("mood")} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pointsFor("financial_stress")} fill="none" stroke="#f24822" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        <polyline points={pointsFor("decision_pressure")} fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-dim">
        <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-emerald" /> Mood</span>
        <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-crimson" /> Financial stress</span>
        <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-yellow" /> Decision pressure</span>
      </div>
    </div>
  );
}
