"use client";

import { CinematicCompass } from "./CinematicCompass";
import { COLORS, withAlpha } from "@/lib/brand";

/**
 * Section 10 — the platform vision as an orbital map: the compass at
 * the center, life's thresholds in orbit. Home is the first node —
 * highlighted — not the whole company.
 */

const NODES = [
  { label: "Buying a home", angle: -90, first: true },
  { label: "Changing careers", angle: -45 },
  { label: "Starting a family", angle: 0 },
  { label: "Taking on debt", angle: 45 },
  { label: "Retirement timing", angle: 90 },
  { label: "Starting a business", angle: 135 },
  { label: "Relocating", angle: 180 },
  { label: "Moving", angle: 225 },
];

export function DecisionOrbit() {
  const radius = 46; // % of container half

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]">
      {/* Orbit path */}
      <div
        aria-hidden
        className="absolute inset-[4%] rounded-full border border-slate-high/40"
        style={{ maskImage: "radial-gradient(circle, transparent 55%, black 56%)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <CinematicCompass size={230} />
      </div>

      {NODES.map((node) => {
        const rad = (node.angle * Math.PI) / 180;
        const x = 50 + radius * Math.cos(rad);
        const y = 50 + radius * Math.sin(rad);
        return (
          <span
            key={node.label}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap backdrop-blur-sm"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              borderColor: node.first ? withAlpha(COLORS.yellow, 0.5) : withAlpha(COLORS.dim, 0.25),
              background: node.first ? withAlpha(COLORS.yellow, 0.08) : withAlpha(COLORS.navyLight, 0.7),
              color: node.first ? COLORS.yellow : COLORS.dim,
              boxShadow: node.first ? `0 0 24px -6px ${withAlpha(COLORS.yellow, 0.4)}` : undefined,
            }}
          >
            {node.first && (
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-yellow align-middle" />
            )}
            {node.label}
            {node.first && <span className="ml-1.5 text-xs uppercase tracking-wider opacity-70">first threshold</span>}
          </span>
        );
      })}
    </div>
  );
}
