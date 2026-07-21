"use client";

import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function CSSLatentFeatures() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const heroTimer = setTimeout(() => {
      const heroHeading = document.querySelector(".hero-deep h1, .hero-deep h2");
      if (heroHeading) {
        heroHeading.classList.add("text-shine", "go");
      }
    }, 500);

    const aurora = document.querySelector(".aurora-band");
    if (aurora) {
      (aurora as HTMLElement).style.opacity = "1";
    }

    return () => clearTimeout(heroTimer);
  }, [reducedMotion]);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (reducedMotion) return;
      const buttons = document.querySelectorAll(".btn-primary, .btn-glow");
      buttons.forEach((btn) => {
        const rect = (btn as HTMLElement).getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 120;

        if (dist < maxDist) {
          const force = 1 - dist / maxDist;
          const mx = (dx / maxDist) * force * 8;
          const my = (dy / maxDist) * force * 8;
          (btn as HTMLElement).style.setProperty("--mx", `${mx}px`);
          (btn as HTMLElement).style.setProperty("--my", `${my}px`);
        } else {
          (btn as HTMLElement).style.setProperty("--mx", "0px");
          (btn as HTMLElement).style.setProperty("--my", "0px");
        }
      });
    },
    [reducedMotion],
  );

  useEffect(() => {
    if (reducedMotion) return;
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove, reducedMotion]);

  const particles = reducedMotion
    ? []
    : Array.from({ length: 5 }, (_, i) => ({
        id: i,
        dur: `${12 + i * 3}s`,
        dx: `${20 + i * 15}px`,
        dy: `${-20 - i * 10}px`,
        size: `${3 + i}px`,
        left: `${15 + i * 18}%`,
        top: `${20 + (i % 3) * 25}%`,
        delay: `${i * 1.5}s`,
      }));

  return (
    <div aria-hidden="true">
      {!reducedMotion && (
        <div className="aurora-band" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1, pointerEvents: "none" }} />
      )}
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            position: "fixed",
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: ["#22d3ee", "#34d399", "#facc15", "#22d3ee", "#34d399"][p.id],
            opacity: 0.4,
            zIndex: 2,
            ["--dur" as string]: p.dur,
            ["--dx" as string]: p.dx,
            ["--dy" as string]: p.dy,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
