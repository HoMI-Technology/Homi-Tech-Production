"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CinematicCompass, type RingGlow } from "./CinematicCompass";

/**
 * The Threshold Compass as a dimensional object in space.
 *
 * Two depth layers — the ring system and the keyhole — tilt in
 * perspective toward the pointer at different rates, so the instrument
 * reads as a gyroscope you could reach into. Behind it, volumetric
 * breathing halos give the light physical air. Canonical in-plane ring
 * rotation is untouched; the 3D tilt is a camera move, not a redesign.
 * Reduced motion: static, flat, fully meaningful.
 */
export function Compass3D({
  size = 400,
  glow,
  verdict,
  keyholePulse = true,
  maxTilt = 9,
  className = "",
  children,
}: {
  size?: number;
  glow?: RingGlow;
  verdict?: "READY" | "ALMOST_THERE" | "BUILD_FIRST" | "NOT_YET";
  keyholePulse?: boolean;
  maxTilt?: number;
  className?: string;
  children?: ReactNode;
}) {
  const ringsRef = useRef<HTMLDivElement>(null);
  const keyholeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nx = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
        const ny = e.clientY / window.innerHeight - 0.5;
        const ry = nx * maxTilt * 2;
        const rx = -ny * maxTilt * 2;
        if (ringsRef.current) {
          ringsRef.current.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0px)`;
        }
        if (keyholeRef.current) {
          // The keyhole sits deeper in the scene — it tilts less and
          // counter-drifts slightly, creating real parallax depth.
          keyholeRef.current.style.transform = `rotateX(${(rx * 0.55).toFixed(2)}deg) rotateY(${(ry * 0.55).toFixed(2)}deg) translateZ(28px)`;
        }
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [maxTilt]);

  return (
    <div
      className={`gyro-scene relative ${className}`}
      style={size > 0 ? { width: size, height: size } : undefined}
    >
      {/* Volumetric halos — light with air around it */}
      <div
        aria-hidden
        className="halo halo-breathe"
        style={{
          inset: "-14%",
          background: "radial-gradient(circle, rgba(34,211,238,0.16), transparent 62%)",
        }}
      />
      <div
        aria-hidden
        className="halo halo-breathe"
        style={{
          inset: "6%",
          background: "radial-gradient(circle, rgba(52,211,153,0.12), transparent 60%)",
          animationDelay: "-3.5s",
        }}
      />
      <div
        aria-hidden
        className="halo"
        style={{
          inset: "30%",
          background: "radial-gradient(circle, rgba(250,204,21,0.14), transparent 65%)",
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
