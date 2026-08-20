"use client";

/**
 * HomieAvatar — floating circular HōMI presence for the voice-first companion.
 * States: breathing (idle presence), listening (waveform), speaking, silent.
 * Abstract orb — no mascot. Brand colors only. User-visible name is always HōMI.
 */

import { COLORS, withAlpha } from "@/lib/brand";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { HomieAvatarState } from "@/types/companion";
import { VoiceWaveform } from "@/components/companion/VoiceWaveform";

export function HomieAvatar({
  state,
  size = 56,
  accent = COLORS.cyan,
  label,
}: {
  state: HomieAvatarState;
  size?: number;
  accent?: string;
  /** Accessible name override. */
  label?: string;
}) {
  const reduced = useReducedMotion();
  const breathing = state === "breathing" || state === "idle" || state === "silent";
  const listening = state === "listening";
  const speaking = state === "speaking" || state === "interrupted";

  const aria =
    label ??
    (listening
      ? "HōMI is listening"
      : speaking
        ? "HōMI is speaking"
        : state === "silent"
          ? "HōMI is present quietly"
          : "HōMI Companion");

  const scaleAnim =
    !reduced && breathing
      ? "homie-breathe 3.2s ease-in-out infinite"
      : !reduced && speaking
        ? "homie-speak-pulse 1.1s ease-in-out infinite"
        : undefined;

  return (
    <span
      role="img"
      aria-label={aria}
      className="relative inline-flex items-center justify-center rounded-full"
      style={{ width: size, height: size }}
    >
      <style>{`
        @keyframes homie-breathe {
          0%, 100% { transform: scale(1); opacity: 0.92; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes homie-speak-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @media (prefers-reduced-motion: reduce) {
          .homie-avatar-core { animation: none !important; }
        }
      `}</style>
      {/* Soft halo */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${withAlpha(accent, 0.35)} 0%, transparent 70%)`,
          transform: listening || speaking ? "scale(1.25)" : "scale(1.1)",
          opacity: state === "silent" ? 0.45 : 0.85,
        }}
      />
      <span
        aria-hidden="true"
        className="homie-avatar-core relative flex items-center justify-center rounded-full border"
        style={{
          width: size * 0.86,
          height: size * 0.86,
          borderColor: withAlpha(accent, 0.45),
          background: `radial-gradient(circle at 35% 30%, ${accent}, ${withAlpha(accent, 0.15)} 72%, ${COLORS.navy} 100%)`,
          boxShadow: `0 0 ${Math.round(size / 2.5)}px ${withAlpha(accent, 0.35)}`,
          animation: scaleAnim,
          opacity: state === "silent" ? 0.7 : 1,
        }}
      >
        {listening ? (
          <VoiceWaveform color={COLORS.navy} bars={5} height={Math.round(size * 0.32)} />
        ) : speaking ? (
          <VoiceWaveform color={COLORS.navy} bars={4} height={Math.round(size * 0.28)} active />
        ) : (
          <span
            className="rounded-full"
            style={{
              width: size * 0.14,
              height: size * 0.14,
              background: COLORS.navy,
              opacity: 0.55,
            }}
          />
        )}
      </span>
    </span>
  );
}
