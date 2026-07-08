"use client";

import { useEffect } from "react";

/**
 * Page-level cinema effects, one instance per page:
 *
 *  · Cursor spotlight — a quiet cyan light following the pointer
 *  · Cinematic vignette — darkened frame edges
 *  · Delegated 3D card tracking — any element with .tilt-3d tilts
 *    toward the pointer and carries a moving specular glare
 *
 * Everything disables itself under prefers-reduced-motion and on
 * touch-only devices (no pointer to follow).
 */
export function CinemaFX() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const root = document.documentElement;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Spotlight position
        root.style.setProperty("--spot-x", `${e.clientX}px`);
        root.style.setProperty("--spot-y", `${e.clientY}px`);

        // 3D tilt + glare on the card under the pointer
        const card = (e.target as Element | null)?.closest?.(".tilt-3d") as HTMLElement | null;
        if (card) {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width; // 0..1
          const py = (e.clientY - r.top) / r.height;
          const ry = (px - 0.5) * 7; // deg
          const rx = (0.5 - py) * 7;
          card.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
          card.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
          card.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
          card.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
          card.style.setProperty("--glare", "1");
        }
      });
    };

    const onOut = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest?.(".tilt-3d") as HTMLElement | null;
      if (card && !card.contains(e.relatedTarget as Node)) {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--glare", "0");
      }
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className="cursor-spotlight" aria-hidden />
      <div className="cinema-vignette" aria-hidden />
    </>
  );
}
