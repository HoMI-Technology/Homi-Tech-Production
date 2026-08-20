"use client";

/**
 * Readiness timeline — the score-history chart on its own page.
 *
 * The chart itself is components/dashboard/ScoreHistory, unchanged. What this
 * adds is the full history: the dashboard shows the trajectory inside a wider
 * board, and there was no surface where the re-checks were the subject.
 *
 * Rows come from GET /api/assessments (newest first, capped at 20) and are
 * reversed so the chart reads left-to-right in time — the same derivation the
 * dashboard uses, so the two surfaces can never tell different stories.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageFrame } from "@/components/operate/PageFrame";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { ScoreHistory, type ScoreHistoryPoint } from "@/components/dashboard/ScoreHistory";
import { LEGAL_DISCLAIMER, type VerdictKey } from "@/lib/brand";

type AssessmentRow = {
  overall_score: number | null;
  verdict: string | null;
  completed_at: string | null;
  created_at: string;
};

function toPoints(rows: AssessmentRow[]): ScoreHistoryPoint[] {
  return [...rows]
    .reverse()
    .filter((r) => r.overall_score !== null && r.verdict !== null)
    .map((r) => ({
      score: Math.round(r.overall_score as number),
      verdict: r.verdict as VerdictKey,
      date: r.completed_at ?? r.created_at,
    }));
}

export function TimelineView() {
  const [points, setPoints] = useState<ScoreHistoryPoint[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/assessments");
        if (!res.ok) {
          if (active) setFailed(true);
          return;
        }
        const json = (await res.json()) as { assessments?: AssessmentRow[] };
        if (active) setPoints(toPoints(json.assessments ?? []));
      } catch {
        if (active) setFailed(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageFrame width="content" density="spacious" role="personal">
      <header>
        <Link href="/dashboard" className="text-sm text-dim transition-colors hover:text-cyan">
          &larr; Continue on Home
        </Link>
        <p className="eyebrow mt-5">Readiness timeline</p>
        <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">
          How your number moved
        </h1>
        <p className="mt-2 max-w-xl text-dim">
          Re-checks from your assessments. Educational guidance only.
        </p>
      </header>

      {points === null && !failed ? (
        <ProductLoadingSkeleton label="Loading score history" rows={1} />
      ) : (
        <section className="glass card-hairline-top mt-8 p-6 sm:p-8">
          {failed ? (
            <p className="text-sm text-dim">
              Your history could not be loaded right now. Reload the page to try again.
            </p>
          ) : (
            <ScoreHistory points={points ?? []} />
          )}
        </section>
      )}

      {points !== null && points.length > 0 && (
        <p className="mt-4 text-sm text-dim">
          <span className="num">{points.length}</span> re-check
          {points.length === 1 ? "" : "s"} on record. Take the assessment again whenever money,
          feeling, or timing changes — the shape of the line is the point, not any single bar.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/assessment" className="btn btn-primary btn-sm">
          Re-check your readiness
        </Link>
        <Link href="/path" className="btn btn-ghost btn-sm">
          Path to Ready
        </Link>
      </div>

      <footer className="mt-12 border-t border-white/[0.06] pt-6">
        <p className="text-xs leading-relaxed text-dim">{LEGAL_DISCLAIMER}</p>
      </footer>
    </PageFrame>
  );
}
