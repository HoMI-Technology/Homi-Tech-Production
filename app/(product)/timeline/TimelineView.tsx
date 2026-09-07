"use client";

/**
 * Readiness timeline — score history as age evidence, not a second hero.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { JobDepthFrame } from "@/components/layout/JobDepthFrame";
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

  const latest = points && points.length > 0 ? points[points.length - 1] : null;

  return (
    <JobDepthFrame job="timeline">
      <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-dim">
        Score history · age as evidence
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-light">Score history</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">
        Quiet age of AssessmentResult writes — not a second home and not a money score.
      </p>
      {latest && (
        <p className="mt-3 text-sm text-dim">
          Last write {new Date(latest.date).toLocaleDateString("en-US", { dateStyle: "medium" })}
          {" · "}
          {points?.length ?? 0} on record
        </p>
      )}

      {points === null && !failed ? (
        <ProductLoadingSkeleton label="Loading score history" rows={1} />
      ) : failed ? (
        <p className="mt-6 text-sm text-dim">
          Your history could not be loaded right now. Reload the page to try again.
        </p>
      ) : (
        <section className="mt-8">
          <ScoreHistory points={points ?? []} />
        </section>
      )}

      <p className="mt-8">
        <Link
          href="/money"
          className="text-sm text-dim underline decoration-white/20 underline-offset-4 hover:text-light"
        >
          Money picture
        </Link>
      </p>

      <footer className="mt-12 border-t border-white/[0.06] pt-6">
        <p className="text-xs leading-relaxed text-dim">{LEGAL_DISCLAIMER}</p>
      </footer>
    </JobDepthFrame>
  );
}
