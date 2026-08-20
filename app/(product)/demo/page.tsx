"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PILLARS, VERDICT_META } from "@/lib/brand";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { ScoreHistory } from "@/components/dashboard/ScoreHistory";
import { DailyPulseStrip } from "@/components/dashboard/DailyPulseStrip";
import { DemoProvider, useDemo } from "@/lib/demo/context";
import { PageFrame } from "@/components/operate/PageFrame";
import { track } from "@/lib/analytics";

const QUICK_ACTIONS = [
  { href: "/assessment", label: "Full Assessment", desc: "The real, precise 3-pillar read." },
  {
    href: "/money",
    label: "Money",
    desc: "Your picture, budget track, and decision math.",
  },
  { href: "/journal", label: "Decision Journal", desc: "Log a decision before you make it." },
  { href: "/daily", label: "Daily Check-in", desc: "A 60-second mood and stress pulse." },
];

/**
 * Public, read-only demo of the HōMI product surface — no auth required.
 * Renders fixed mock data via DemoProvider/useDemo rather than trying to
 * make the real (auth-gated) /dashboard work for anonymous visitors.
 * Quick-action links below point at the real, possibly-gated product.
 */
export default function DemoPage() {
  return (
    <DemoProvider>
      <DemoPageContent />
    </DemoProvider>
  );
}

function DemoPageContent() {
  const demo = useDemo();
  const meta = VERDICT_META[demo.verdict];

  useEffect(() => {
    try {
      window.localStorage.setItem("homi:demo-viewed", "1");
    } catch {
      // Not fatal — purely a future analytics/EmptyState hint.
    }
    track("demo_viewed");
  }, []);

  return (
    <PageFrame width="content" density="spacious" role="personal">
      {/* Demo banner */}
      <div className="glass flex flex-col items-start justify-between gap-4 border border-cyan/30 p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-cyan">
            Demo data — your real read takes 3 minutes
          </p>
          <p className="mt-1 text-sm text-dim">
            Everything below is a fixed example, not a live account. Nothing here is saved or
            shared.
          </p>
        </div>
        <Link href="/assessment" className="btn btn-primary shrink-0 btn-sm">
          Assess
        </Link>
      </div>

      <h1 className="mt-8 font-display text-3xl text-light">
        HōMI in demo — <span className="text-aurora">{demo.profileName}</span>
      </h1>
      <p className="mt-2 text-dim">A read-only look at what your dashboard could show.</p>

      {/* Hero card */}
      <div className="glass mt-8 grid gap-8 p-8 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex justify-center">
          <ThresholdCompass size={160} verdict={demo.verdict} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="score-numeral text-5xl font-bold text-light">{demo.score}</span>
            <VerdictBadge verdict={demo.verdict} size="lg" />
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">{meta.line}</p>
          <p className="mt-3 text-xs text-dim">Streak: {demo.streak} days of check-ins.</p>
        </div>
      </div>

      {/* Score history */}
      <div className="glass mt-8 p-8">
        <h2 className="text-lg font-semibold text-light">Score history</h2>
        <p className="mt-1 text-sm text-dim">Example progress over three assessments.</p>
        <div className="mt-6">
          <ScoreHistory points={demo.scoreHistory} />
        </div>
      </div>

      {/* Pillar cards */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {PILLARS.map((pillar) => {
          const value = demo.pillars[pillar.key];
          const max = demo.pillarMax[pillar.key];
          const pct = Math.max(0, Math.min(100, (value / max) * 100));
          return (
            <div key={pillar.key} className="glass p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-light">{pillar.name}</h3>
                {/* Percentages only: /demo is anonymous-readable, and a raw
                    "n / max" pair publishes the exact pillar maxima — the same
                    leak class as the /share ring geometry (2026-08 audit). */}
                <span className="score-numeral text-sm text-dim">{Math.round(pct)}%</span>
              </div>
              <p className="mt-1 text-xs text-dim">{pillar.question}</p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: pillar.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Outcome survey — static presentational card */}
      {demo.outcomeSurveyDue && (
        <div className="glass mt-8 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-light">Checking in — 90 days later</h2>
          <p className="mt-1 text-sm text-dim">
            A while back you decided to move forward. No judgment either way — how has it gone?
          </p>
          <p className="mt-4 text-xs text-dim">
            Example only — this survey is not interactive in the demo.
          </p>
        </div>
      )}

      {/* Journal entries */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-light">Decision journal</h2>
        <div className="flex flex-col gap-4">
          {demo.journalEntries.map((entry) => (
            <div key={entry.title} className="glass p-6">
              <span className="rounded-full bg-slate-surface px-2.5 py-0.5 text-xs text-dim">
                {entry.decision_type.replace(/_/g, " ")}
              </span>
              <h3 className="mt-2 font-semibold text-light">{entry.title}</h3>
              <p className="mt-2 text-sm text-dim">{entry.context}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily pulse */}
      <div className="glass mt-8 p-8">
        <h2 className="text-lg font-semibold text-light">Daily pulse</h2>
        <p className="mt-1 text-sm text-dim">Mood and stress trend from example check-ins.</p>
        <div className="mt-6">
          <DailyPulseStrip checkins={demo.checkins} />
        </div>
      </div>

      {/* Quick actions — real links into the product */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-light">Try it for real</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="glass glass-hover flex flex-col gap-2 p-5"
            >
              <span className="font-semibold text-light">{action.label}</span>
              <p className="text-xs text-dim">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </PageFrame>
  );
}
