"use client";

/**
 * Minimal waveform bars for HōMI listening / speaking states.
 */

import { COLORS } from "@/lib/brand";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function VoiceWaveform({
  bars = 5,
  color = COLORS.cyan,
  height = 16,
  active = true,
}: {
  bars?: number;
  color?: string;
  height?: number;
  /** When false, bars stay near-idle (used as a static glyph). */
  active?: boolean;
}) {
  const reduced = useReducedMotion();
  const count = Math.max(3, Math.min(8, bars));

  return (
    <span
      aria-hidden="true"
      className="flex items-end justify-center gap-[2px]"
      style={{ height }}
    >
      <style>{`
        @keyframes homie-wave {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .homie-wave-bar { animation: none !important; transform: scaleY(0.55) !important; }
        }
      `}</style>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="homie-wave-bar inline-block w-[3px] rounded-full origin-bottom"
          style={{
            height: "100%",
            background: color,
            opacity: 0.85,
            animation:
              active && !reduced
                ? `homie-wave ${0.7 + (i % 3) * 0.15}s ease-in-out ${i * 0.08}s infinite`
                : undefined,
            transform: !active || reduced ? `scaleY(${0.35 + (i % 3) * 0.15})` : undefined,
          }}
        />
      ))}
    </span>
  );
}
