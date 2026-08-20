"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CinematicCompass, type RingGlow } from "./CinematicCompass";
import { COLORS, withAlpha } from "@/lib/brand";

/**
 * The Threshold Compass as a dimensional object in space.
 *
 * Two depth layers — the ring system and the keyhole — tilt in
 * perspective toward the pointer at different rates, so the instrument
 * reads as a gyroscope you could reach into. Behind it, volumetric
 * breathing halos give the light physical air. Canonical in-plane ring
 * rotation is untouched; the 3D tilt is a camera move, not a redesign.
 * With `scrollRecede`, the whole instrument settles gently back in depth
 * as the hero scrolls away. Reduced motion: static, flat, fully meaningful.
 */
export function Compass3D({
  size = 400,
  glow,
  verdict,
  keyholePulse = true,
  maxTilt = 9,
  scrollRecede = false,
  className = "",
  children,
}: {
  size?: number;
  glow?: RingGlow;
  verdict?: "READY" | "ALMOST_THERE" | "BUILD_FIRST" | "NOT_YET";
  keyholePulse?: boolean;
  maxTilt?: number;
  scrollRecede?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const ringsRef = useRef<HTMLDivElement>(null);
  const keyholeRef = useRef<HTMLDivElement>(null);
  // Latest tilt angles and scroll-recede progress, composed in apply().
  const poseRef = useRef({ rx: 0, ry: 0, p: 0 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse && !scrollRecede) return;

    let raf = 0;
    const apply = () => {
      const { rx, ry, p } = poseRef.current;
      if (ringsRef.current) {
        // Recede: the ring system settles back and shrinks a touch as the
        // hero scrolls away — depth, not a spin.
        ringsRef.current.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${(1 - p * 0.05).toFixed(4)}) translateZ(0px)`;
      }
      if (keyholeRef.current) {
        // The keyhole sits deeper in the scene — it tilts less, and on
        // scroll it sinks further back, widening the gap between layers.
        keyholeRef.current.style.transform = `rotateX(${(rx * 0.55).toFixed(2)}deg) rotateY(${(ry * 0.55).toFixed(2)}deg) translateZ(${(28 + p * 36).toFixed(1)}px) translateY(${(-p * 8).toFixed(1)}px)`;
      }
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
      const ny = e.clientY / window.innerHeight - 0.5;
      poseRef.current.ry = nx * maxTilt * 2;
      poseRef.current.rx = -ny * maxTilt * 2;
      schedule();
    };
    const onScroll = () => {
      // 0 at hero top, 1 once the first viewport has scrolled away.
      poseRef.current.p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.9)));
      schedule();
    };

    if (!coarse) window.addEventListener("pointermove", onMove, { passive: true });
    if (scrollRecede) {
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [maxTilt, scrollRecede]);

  return (
    <div
      className={`gyro-scene relative ${className}`}
      style={size > 0 ? { width: size, height: size } : { width: "100%", height: "100%" }}
    >
      {/* Volumetric halos — light with air around it */}
      <div
        aria-hidden
        className="halo halo-breathe"
        style={{
          inset: "-14%",
          background: `radial-gradient(circle, ${withAlpha(COLORS.cyan, 0.16)}, transparent 62%)`,
        }}
      />
      <div
        aria-hidden
        className="halo halo-breathe"
        style={{
          inset: "6%",
          background: `radial-gradient(circle, ${withAlpha(COLORS.emerald, 0.12)}, transparent 60%)`,
          animationDelay: "-3.5s",
        }}
      />
      <div
        aria-hidden
        className="halo"
        style={{
          inset: "30%",
          background: `radial-gradient(circle, ${withAlpha(COLORS.yellow, 0.14)}, transparent 65%)`,
        }}
      />

      {/* Instrument body — navy glass under the rings, cyan material only */}
      <div
        aria-hidden
        className="absolute inset-[8%] rounded-full"
        style={{
          background: `radial-gradient(circle at 36% 30%, ${withAlpha(COLORS.cyan, 0.2)}, ${withAlpha(COLORS.navy, 0.42)} 38%, ${withAlpha(COLORS.navy, 0.88)} 72%)`,
          boxShadow: `0 28px 80px ${withAlpha(COLORS.cyan, 0.16)}, inset 0 1px 0 ${withAlpha(COLORS.cyan, 0.22)}`,
        }}
      />

      {/* Ring system — the outer depth layer */}
      <div ref={ringsRef} className="gyro-layer absolute inset-0">
        <CinematicCompass responsive glow={glow} verdict={verdict} layer="rings" />
      </div>

      {/* Keyhole — deeper in the scene */}
      <div ref={keyholeRef} className="gyro-layer absolute inset-0">
        <CinematicCompass
          responsive
          glow={glow}
          verdict={verdict}
          keyholePulse={keyholePulse}
          layer="keyhole"
        />
      </div>

      {children}
    </div>
  );
}
