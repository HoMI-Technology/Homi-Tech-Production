"use client";

import { useEffect, useRef, useState } from "react";
import { COLORS, withAlpha } from "@/lib/brand";

const KEY = "homi:rings-drawn";

/**
 * Dashboard pillar ring — ScoreRing's exact visual language (r=54 arc,
 * JetBrains Mono numeral, pillar color) plus a one-time arc draw-in the first
 * time it scrolls into view each session. The numeral is always the final
 * server value — never a 0 → N ticker (deterministic code scores; the UI only
 * renders the returned integer). Server HTML, repeat visits, reduced motion,
 * and no-JS all render the finished ring.
 */
export function PillarRing({
  value,
  max = 100,
  size = 120,
  color = COLORS.cyan,
  sublabel,
}: {
  value: number;
  max?: number;
  size?: number;
  color?: string;
  sublabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"static" | "armed" | "drawing">("static");

  useEffect(() => {
    let drawn = true;
    try {
      drawn = window.sessionStorage.getItem(KEY) === "1";
    } catch {
      return;
    }
    if (drawn || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setPhase("armed");
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            io.disconnect();
            try {
              window.sessionStorage.setItem(KEY, "1");
            } catch {
              // best effort
            }
            // Double-rAF: let the zero-state paint before the sweep target lands.
            requestAnimationFrame(() => requestAnimationFrame(() => setPhase("drawing")));
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const r = 54;
  const c = 2 * Math.PI * r;
  const shownValue = phase === "armed" ? 0 : value;
  const pct = Math.max(0, Math.min(1, shownValue / max));
  const dash = c * pct;

  return (
    <div ref={ref} className="inline-flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 128 128" width={size} height={size} aria-hidden="true">
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke={withAlpha(COLORS.slateHigh, 0.6)}
            strokeWidth="8"
          />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            transform="rotate(-90 64 64)"
            style={{
              filter: `drop-shadow(0 0 10px ${color}66)`,
              transition: "stroke-dasharray 900ms cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            aria-hidden
            className="score-numeral font-bold tabular-nums text-light"
            style={{ fontSize: size * 0.24 }}
          >
            {value}
          </span>
          {sublabel && (
            <span aria-hidden className="text-dim" style={{ fontSize: size * 0.07 }}>
              {sublabel}
            </span>
          )}
          <span className="sr-only">{`${value} ${sublabel ?? `of ${max}`}`}</span>
        </div>
      </div>
    </div>
  );
}
