"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { COLORS, withAlpha } from "@/lib/brand";

/**
 * The Threshold Compass as a dimensional, floating, orbital instrument.
 * Canonical geometry (viewBox 200, rings r=85/60/35, 4:3:2), canonical
 * motion (20s CW / 15s CCW / 10s CW, linear — harmonic alignment every
 * 60s), with per-ring brightness control so sections can converse with
 * the instrument. Pointer parallax on the wrapper; everything stills
 * under prefers-reduced-motion (handled in globals.css).
 */

export interface RingGlow {
  /** 0..1 brightness multiplier per ring; 1 = canonical opacity. */
  outer?: number;
  middle?: number;
  inner?: number;
}

const VERDICT_COLORS: Record<string, string> = {
  READY: COLORS.emerald,
  ALMOST_THERE: COLORS.yellow,
  BUILD_FIRST: COLORS.amber,
  NOT_YET: COLORS.crimson,
};

export function CinematicCompass({
  size = 420,
  glow = { outer: 1, middle: 1, inner: 1 },
  verdict,
  keyholePulse = false,
  materialized = true,
  stagger = false,
  responsive = false,
  layer = "all",
  className = "",
}: {
  size?: number;
  glow?: RingGlow;
  verdict?: keyof typeof VERDICT_COLORS;
  keyholePulse?: boolean;
  /** When false, rings render invisible until materialized flips true. */
  materialized?: boolean;
  /** Staggers ring materialization outer → middle → inner (1s apart). */
  stagger?: boolean;
  /** When true, fills its container (wrapper controls size responsively). */
  responsive?: boolean;
  /** Render subset for depth-layered 3D scenes. Default renders all. */
  layer?: "rings" | "keyhole" | "all";
  className?: string;
}) {
  const [visible, setVisible] = useState(!stagger && materialized ? 3 : 0);

  useEffect(() => {
    if (!materialized) return;
    if (!stagger) {
      setVisible(3);
      return;
    }
    const timers = [
      setTimeout(() => setVisible(1), 0),
      setTimeout(() => setVisible(2), 1000),
      setTimeout(() => setVisible(3), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [materialized, stagger]);

  const pip = verdict ? VERDICT_COLORS[verdict] : COLORS.yellow;
  const unlocked = verdict === "READY";
  const o = (glow.outer ?? 1) * 0.6;
  const m = (glow.middle ?? 1) * 0.7;
  const i = (glow.inner ?? 1) * 0.8;

  return (
    <svg
      viewBox="0 0 200 200"
      width={responsive ? undefined : size}
      height={responsive ? undefined : size}
      className={`compass-glow ${responsive ? "h-auto w-full" : ""} ${className}`}
      role="img"
      aria-label="HōMI Threshold Compass showing Financial Reality, Emotional Truth, and Perfect Timing around the user at the decision threshold."
    >
      <defs>
        <filter id="cc-glow" x="-24%" y="-24%" width="148%" height="148%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="cc-emit" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.045 0"
            result="grain"
          />
        </filter>
        <linearGradient
          id="cc-comet"
          x1="100"
          y1="15"
          x2="57.5"
          y2="26.4"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={COLORS.cyan} stopOpacity="0.9" />
          <stop offset="100%" stopColor={COLORS.cyan} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Instrument gradations — precision ticks + emitted hairlines */}
      {layer !== "keyhole" && (
        <g className={`ring-materialize ${visible >= 1 ? "is-on" : ""}`} aria-hidden>
          <circle
            cx="100"
            cy="100"
            r="96"
            fill={COLORS.cyan}
            opacity="0.04"
            filter="url(#cc-emit)"
          />
          <circle
            cx="100"
            cy="100"
            r="79"
            stroke={COLORS.light}
            strokeWidth="3"
            fill="none"
            opacity="0.06"
            strokeDasharray="1 7.27"
          />
          <circle
            cx="100"
            cy="100"
            r="72.5"
            stroke={COLORS.cyan}
            strokeWidth="0.45"
            fill="none"
            opacity="0.16"
          />
          <circle
            cx="100"
            cy="100"
            r="67"
            stroke={COLORS.cyan}
            strokeWidth="0.35"
            fill="none"
            opacity="0.08"
          />
          <circle
            cx="100"
            cy="100"
            r="47.5"
            stroke={COLORS.emerald}
            strokeWidth="0.45"
            fill="none"
            opacity="0.16"
          />
          <circle
            cx="100"
            cy="100"
            r="42"
            stroke={COLORS.emerald}
            strokeWidth="0.35"
            fill="none"
            opacity="0.08"
          />
          <circle
            cx="100"
            cy="100"
            r="28"
            stroke={COLORS.yellow}
            strokeWidth="0.35"
            fill="none"
            opacity="0.1"
          />
        </g>
      )}

      {/* Comet — a bright grain of light tracing the outer ring */}
      {layer !== "keyhole" && (
        <g className={`comet-orbit ring-materialize ${visible >= 1 ? "is-on" : ""}`} aria-hidden>
          <path
            d="M 100 15 A 85 85 0 0 0 57.5 26.4"
            stroke="url(#cc-comet)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle
            cx="100"
            cy="15"
            r="2.6"
            fill={COLORS.light}
            style={{
              filter: `drop-shadow(0 0 6px ${COLORS.cyan}) drop-shadow(0 0 14px ${COLORS.cyan})`,
            }}
          />
        </g>
      )}

      {/* Outer — Financial Reality, cyan, 20s CW */}
      {layer !== "keyhole" && (
        <g
          className={`ring-outer ring-materialize ${visible >= 1 ? "is-on" : ""}`}
          filter="url(#cc-glow)"
          style={{ transition: "opacity 1200ms ease" }}
        >
          <circle
            cx="100"
            cy="100"
            r="85"
            stroke={COLORS.cyan}
            strokeWidth="2"
            fill="none"
            opacity={o}
          />
          <circle cx="160.1" cy="39.9" r="3" fill={COLORS.cyan} opacity={Math.min(1, o + 0.3)} />
          <circle cx="160.1" cy="160.1" r="3" fill={COLORS.cyan} opacity={Math.min(1, o + 0.3)} />
          <circle cx="39.9" cy="160.1" r="3" fill={COLORS.cyan} opacity={Math.min(1, o + 0.3)} />
          <circle cx="39.9" cy="39.9" r="3" fill={COLORS.cyan} opacity={Math.min(1, o + 0.3)} />
        </g>
      )}

      {/* Middle — Emotional Truth, emerald, 15s CCW */}
      {layer !== "keyhole" && (
        <g
          className={`ring-middle ring-materialize ${visible >= 2 ? "is-on" : ""}`}
          filter="url(#cc-glow)"
        >
          <circle
            cx="100"
            cy="100"
            r="60"
            stroke={COLORS.emerald}
            strokeWidth="2"
            fill="none"
            opacity={m}
          />
          <circle cx="100" cy="40" r="2.5" fill={COLORS.emerald} opacity={Math.min(1, m + 0.3)} />
          <circle cx="160" cy="100" r="2.5" fill={COLORS.emerald} opacity={Math.min(1, m + 0.3)} />
          <circle cx="100" cy="160" r="2.5" fill={COLORS.emerald} opacity={Math.min(1, m + 0.3)} />
          <circle cx="40" cy="100" r="2.5" fill={COLORS.emerald} opacity={Math.min(1, m + 0.3)} />
        </g>
      )}

      {/* Inner — Perfect Timing, yellow, 10s CW */}
      {layer !== "keyhole" && (
        <g
          className={`ring-inner ring-materialize ${visible >= 3 ? "is-on" : ""}`}
          filter="url(#cc-glow)"
        >
          <circle
            cx="100"
            cy="100"
            r="35"
            stroke={COLORS.yellow}
            strokeWidth="2"
            fill="none"
            opacity={i}
          />
        </g>
      )}

      {/* Keyhole — the user at the threshold */}
      {layer !== "rings" && (
        <g
          filter="url(#cc-glow)"
          className={`ring-materialize ${visible >= 3 ? "is-on" : ""} ${keyholePulse ? "keyhole-pulse" : ""}`}
        >
          <circle
            cx="100"
            cy="96"
            r="12"
            fill="none"
            stroke={unlocked ? COLORS.emerald : COLORS.yellow}
            strokeWidth="2"
          />
          <rect
            x="94"
            y="104"
            width="12"
            height="16"
            rx="2"
            fill="none"
            stroke={unlocked ? COLORS.emerald : COLORS.yellow}
            strokeWidth="2"
          />
          <circle cx="100" cy="96" r="6" fill={pip} />
          <rect
            x="97"
            y="96"
            width="6"
            height="12"
            fill={unlocked ? COLORS.emerald : COLORS.yellow}
          />
        </g>
      )}
    </svg>
  );
}

/**
 * Pointer-parallax wrapper: the compass drifts a few pixels toward the
 * pointer — dimensional, never frantic. Off under reduced motion.
 */
export function ParallaxLayer({
  children,
  strength = 14,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = ((e.clientX - cx) / window.innerWidth) * strength;
        const dy = ((e.clientY - cy) / window.innerHeight) * strength;
        el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [strength]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ transition: "transform 400ms cubic-bezier(0.16,1,0.3,1)" }}
    >
      {children}
    </div>
  );
}

/** A handful of slow atmospheric particles. Deterministic positions. */
export function Particles() {
  const dots = [
    {
      left: "12%",
      top: "22%",
      size: 3,
      color: withAlpha(COLORS.cyan, 0.5),
      dx: 24,
      dy: -18,
      dur: 16,
    },
    {
      left: "82%",
      top: "18%",
      size: 2,
      color: withAlpha(COLORS.emerald, 0.45),
      dx: -18,
      dy: 22,
      dur: 19,
    },
    {
      left: "70%",
      top: "68%",
      size: 3,
      color: withAlpha(COLORS.yellow, 0.35),
      dx: 16,
      dy: -26,
      dur: 14,
    },
    {
      left: "22%",
      top: "72%",
      size: 2,
      color: withAlpha(COLORS.cyan, 0.4),
      dx: -22,
      dy: -14,
      dur: 21,
    },
    {
      left: "48%",
      top: "12%",
      size: 2,
      color: withAlpha(COLORS.light, 0.3),
      dx: 12,
      dy: 20,
      dur: 17,
    },
    {
      left: "90%",
      top: "48%",
      size: 2,
      color: withAlpha(COLORS.cyan, 0.35),
      dx: -14,
      dy: -20,
      dur: 15,
    },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-[1]">
      {dots.map((d, idx) => (
        <span
          key={idx}
          className="particle"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            background: d.color,
            ["--dx" as string]: `${d.dx}px`,
            ["--dy" as string]: `${d.dy}px`,
            ["--dur" as string]: `${d.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
