"use client";

import { useState } from "react";
import { COLORS, VERDICT_META, withAlpha, type VerdictKey } from "@/lib/brand";

export interface ScoreHistoryPoint {
  score: number;
  verdict: VerdictKey;
  date: string; // ISO date
}

const WIDTH = 640;
const HEIGHT = 190;
const PAD_X = 24;
const PAD_TOP = 26;
const PAD_BOTTOM = 34;
const BAR_GAP = 10;
/** Cap so one lonely assessment doesn't render a 580px slab. */
const MAX_BAR_WIDTH = 48;

const THRESHOLDS: Array<{ mark: number; label: string }> = [
  { mark: 80, label: "Ready" },
  { mark: 65, label: "Almost" },
  { mark: 50, label: "Build" },
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * HōMI-Score trajectory, verdict-colored, with the canonical thresholds named
 * on the grid, real dates on the axis, and a hover tooltip (date · score ·
 * verdict). Sparse histories center at a capped bar width instead of
 * stretching. Keyboard/screen-reader users get the full data as a
 * visually-hidden table — no ARIA gymnastics inside the SVG.
 */
export function ScoreHistory({ points }: { points: ScoreHistoryPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-dim">
        No assessments yet — your score history will appear here.
      </div>
    );
  }

  const chartWidth = WIDTH - PAD_X * 2;
  const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(6, chartWidth / points.length - BAR_GAP));
  const contentWidth = points.length * (barWidth + BAR_GAP) - BAR_GAP;
  const offsetX = PAD_X + Math.max(0, (chartWidth - contentWidth) / 2);

  const xFor = (i: number) => offsetX + i * (barWidth + BAR_GAP);
  const yFor = (score: number) => PAD_TOP + chartHeight - (score / 100) * chartHeight;

  const first = points[0];
  const last = points[points.length - 1];
  const hovered = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={`Score history: ${points.length} assessment${points.length === 1 ? "" : "s"}, latest ${last.score} (${VERDICT_META[last.verdict]?.label ?? last.verdict})`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHover(null)}
      >
        {/* Named verdict thresholds — the grid explains itself. */}
        {THRESHOLDS.map(({ mark, label }) => {
          const y = yFor(mark);
          return (
            <g key={mark}>
              <line
                x1={PAD_X}
                x2={WIDTH - PAD_X}
                y1={y}
                y2={y}
                stroke={withAlpha(COLORS.dim, 0.15)}
                strokeDasharray="4 4"
              />
              <text
                x={WIDTH - PAD_X}
                y={y - 4}
                textAnchor="end"
                fontSize="9"
                fill={withAlpha(COLORS.dim, 0.55)}
                fontFamily="var(--font-sans)"
              >
                {label} {mark}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => {
          const x = xFor(i);
          const barHeight = Math.max(2, (p.score / 100) * chartHeight);
          const y = PAD_TOP + chartHeight - barHeight;
          const color = VERDICT_META[p.verdict]?.color ?? COLORS.cyan;
          const isHover = hover === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHover(i)}
              style={{ cursor: "default" }}
            >
              {/* Invisible hit area the full column height — hover shouldn't demand pixel aim. */}
              <rect
                x={x - BAR_GAP / 2}
                y={PAD_TOP}
                width={barWidth + BAR_GAP}
                height={chartHeight}
                fill="transparent"
              />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={color}
                opacity={isHover ? 1 : 0.85}
                style={{ transition: "opacity 150ms ease" }}
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="10"
                fill={isHover ? COLORS.light : COLORS.dim}
                fontFamily="var(--font-score)"
              >
                {p.score}
              </text>
            </g>
          );
        })}

        {/* Time context: first and last assessment dates. */}
        <text
          x={xFor(0) + barWidth / 2}
          y={HEIGHT - 12}
          textAnchor="middle"
          fontSize="9"
          fill={withAlpha(COLORS.dim, 0.7)}
          fontFamily="var(--font-sans)"
        >
          {fmtDate(first.date)}
        </text>
        {points.length > 1 && (
          <text
            x={xFor(points.length - 1) + barWidth / 2}
            y={HEIGHT - 12}
            textAnchor="middle"
            fontSize="9"
            fill={withAlpha(COLORS.dim, 0.7)}
            fontFamily="var(--font-sans)"
          >
            {fmtDate(last.date)}
          </text>
        )}

        {/* Tooltip — SVG-native so it scales with the chart. */}
        {hovered && hover !== null && (
          <g pointerEvents="none">
            {(() => {
              const cx = Math.max(70, Math.min(WIDTH - 70, xFor(hover) + barWidth / 2));
              const meta = VERDICT_META[hovered.verdict];
              return (
                <>
                  <rect
                    x={cx - 66}
                    y={2}
                    width={132}
                    height={20}
                    rx={6}
                    fill={withAlpha(COLORS.navyLight, 0.95)}
                    stroke={withAlpha(COLORS.dim, 0.25)}
                  />
                  <text
                    x={cx}
                    y={15.5}
                    textAnchor="middle"
                    fontSize="10"
                    fill={COLORS.light}
                    fontFamily="var(--font-sans)"
                  >
                    {fmtDate(hovered.date)} · {hovered.score} ·{" "}
                    <tspan fill={meta?.color ?? COLORS.cyan}>{meta?.label ?? hovered.verdict}</tspan>
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Full data for keyboard and screen-reader users. */}
      <table className="sr-only">
        <caption>Score history by assessment date</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Score</th>
            <th scope="col">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td>{fmtDate(p.date)}</td>
              <td>{p.score}</td>
              <td>{VERDICT_META[p.verdict]?.label ?? p.verdict}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
