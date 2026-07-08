"use client";

import type { ScenarioOutcome } from "@/lib/decisions/simulate";

const SCENARIO_COLORS: Record<string, string> = {
  "buy-now": "#22d3ee",
  "wait-12": "#facc15",
  "wait-24": "#f24822",
};

const WIDTH = 640;
const HEIGHT = 320;
const PAD_LEFT = 64;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 36;

function formatCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

/** Layered SVG line chart of net position over 60 months for each scenario. */
export function NetPositionChart({ scenarios }: { scenarios: ScenarioOutcome[] }) {
  const allValues = scenarios.flatMap((s) => s.series.map((p) => p.netPosition));
  const maxVal = Math.max(...allValues, 0);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;
  const maxMonth = Math.max(...scenarios.flatMap((s) => s.series.map((p) => p.month)), 1);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  function x(month: number): number {
    return PAD_LEFT + (month / maxMonth) * plotWidth;
  }
  function y(value: number): number {
    return PAD_TOP + plotHeight - ((value - minVal) / range) * plotHeight;
  }

  const zeroY = y(0);

  const gridValues = [minVal, minVal + range / 2, maxVal];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label="Line chart comparing net financial position over 60 months for each scenario"
    >
      {/* Gridlines */}
      {gridValues.map((v, i) => (
        <g key={i}>
          <line
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={y(v)}
            y2={y(v)}
            stroke="#334155"
            strokeWidth={1}
            strokeDasharray={v === 0 ? undefined : "4 4"}
            opacity={v === 0 ? 0.8 : 0.4}
          />
          <text x={PAD_LEFT - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#94a3b8" fontFamily="var(--font-score)">
            {formatCompact(v)}
          </text>
        </g>
      ))}

      {/* Month axis labels */}
      {[0, 12, 24, 36, 48, 60].filter((m) => m <= maxMonth).map((m) => (
        <text key={m} x={x(m)} y={HEIGHT - PAD_BOTTOM + 20} textAnchor="middle" fontSize={11} fill="#94a3b8">
          {m === 0 ? "Now" : `${m}mo`}
        </text>
      ))}

      {/* Zero baseline emphasis */}
      <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={zeroY} y2={zeroY} stroke="#e2e8f0" strokeWidth={1} opacity={0.5} />

      {/* Scenario lines */}
      {scenarios.map((s) => {
        const points = s.series.map((p) => `${x(p.month)},${y(p.netPosition)}`).join(" ");
        const color = SCENARIO_COLORS[s.key] ?? "#22d3ee";
        return (
          <g key={s.key}>
            <polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(s.series[s.series.length - 1].month)} cy={y(s.series[s.series.length - 1].netPosition)} r={4} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}
