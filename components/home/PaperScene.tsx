"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Lit stage for the mid-page locked lines. Adds a pointer-tracked
 * volumetric light over the field — the same interaction physics as the
 * hero compass gyroscope (rAF, passive, pointer-fine only). Reduced
 * motion and no-JS render the field fully lit and static; the spotlight
 * never exists for them.
 */
export function PaperScene({ children }: { children: ReactNode }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const field = fieldRef.current;
    const light = lightRef.current;
    if (!field || !light) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = field.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        light.style.transform = `translate(calc(${x.toFixed(0)}px - 50%), calc(${y.toFixed(0)}px - 50%))`;
      });
    };
    field.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      field.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={fieldRef} className="paper-field scene3d">
      <div ref={lightRef} className="paper-spotlight" aria-hidden />
      {children}
    </div>
  );
}
