"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const bar = barRef.current;
    if (!bar) return;

    const lerpFactor = 0.15;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;

      if (docHeight <= 0) {
        targetRef.current = 0;
      } else {
        targetRef.current = Math.min(1, Math.max(0, scrollTop / docHeight));
      }

      const diff = targetRef.current - progressRef.current;
      progressRef.current += diff * lerpFactor;

      const visible = scrollTop > 10 && progressRef.current > 0.001;
      bar.style.opacity = visible ? "1" : "0";
      bar.style.transform = `scaleX(${progressRef.current})`;

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        zIndex: 9999,
        background: "linear-gradient(90deg, #22d3ee, #34d399)",
        transformOrigin: "left",
        transform: "scaleX(0)",
        opacity: 0,
        transition: "opacity 200ms ease",
        willChange: "transform, opacity",
        pointerEvents: "none",
      }}
    />
  );
}
