"use client";

import { GENOME_DIMENSIONS } from "@/lib/genome/constants";

interface GenomeWidgetProps {
  scores: Record<string, number> | null;
}

export function GenomeWidget({ scores }: GenomeWidgetProps) {
  if (!scores || Object.keys(scores).length === 0) {
    return (
      <div className="glass p-6">
        <p className="eyebrow">Behavioral Genome</p>
        <h3 className="mt-2 font-display text-xl text-light">Your decision DNA</h3>
        <p className="mt-3 text-sm text-dim">
          Complete the behavioral genome assessment to reveal your 9 decision-psychology dimensions.
        </p>
        <a href="/genome" className="btn btn-primary mt-4 !px-4 !py-2 text-sm">
          Start Genome Assessment
        </a>
      </div>
    );
  }

  return (
    <div className="glass p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Behavioral Genome</p>
          <h3 className="mt-2 font-display text-xl text-light">Your decision DNA</h3>
          <p className="mt-1 text-sm text-dim">
            Nine dimensions that shape how you make decisions.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {GENOME_DIMENSIONS.map((dim) => {
          const score = (scores[dim.key] as number | undefined) ?? 0;
          const pct = Math.max(0, Math.min(100, score));
          return (
            <div key={dim.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-light">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke={dim.color} strokeWidth="1.5">
                    <path d={dim.icon} />
                  </svg>
                  {dim.name}
                </span>
                <span className="score-numeral text-dim">{Math.round(pct)}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${dim.color}66, ${dim.color})` }}
                />
              </div>
              <p className="mt-0.5 text-xs text-dim/70">{dim.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
