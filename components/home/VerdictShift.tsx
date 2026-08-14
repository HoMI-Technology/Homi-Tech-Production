"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { COLORS, withAlpha } from "@/lib/brand";

/**
 * Section 6 — "Not Yet Is Not No" as a visual moment. When the section
 * enters the viewport, temperature shifts from Warm to Warm+: amber glow,
 * a build path — and deliberately no fake HōMI-Score, no red, no panic,
 * no shame.
 */
export function VerdictShift() {
  const ref = useRef<HTMLDivElement>(null);
  const [shifted, setShifted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShifted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          const t = setTimeout(() => setShifted(true), 900);
          io.disconnect();
          return () => clearTimeout(t);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const color = shifted ? COLORS.amber : COLORS.yellow;
  const temp = shifted ? "Warm+" : "Warm";

  return (
    <div ref={ref} className="grid items-center gap-10 lg:grid-cols-2">
      {/* The shift */}
      <div
        className="glass mx-auto w-full max-w-md p-8 text-center"
        style={{
          borderColor: `${color}44`,
          boxShadow: shifted ? `0 0 60px -20px ${withAlpha(COLORS.amber, 0.45)}` : undefined,
          transition: "all 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
        aria-live="polite"
      >
        <p className="text-xs uppercase tracking-[0.25em] text-dim">Temperature</p>
        <p
          className="mt-2 font-display text-6xl font-bold"
          style={{ color, transition: "all 500ms ease" }}
        >
          {temp}
        </p>
        <p className="mt-2 text-xs text-dim/70">Illustration — not a HōMI-Score</p>

        {/* The build path appears — the map, not the wall */}
        <div
          className="mt-6 overflow-hidden text-left"
          style={{
            maxHeight: shifted ? 200 : 0,
            opacity: shifted ? 1 : 0,
            transition: "all 700ms cubic-bezier(0.16,1,0.3,1) 200ms",
          }}
        >
          <div className="rounded-xl border border-amber/30 bg-amber/5 p-4">
            <p className="text-sm font-semibold text-amber">Your build path</p>
            <ul className="mt-2 space-y-1.5 text-sm text-dim">
              <li>1. Extend your runway to a full three months.</li>
              <li>2. Let one warm signal cool before you re-test.</li>
              <li>3. Re-take the read in 30 days. The map updates with you.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* The idea */}
      <div>
        <h2 className="type-h2">Not yet is not no.</h2>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-dim">
          It is clarity. It is protection. The most valuable answer HōMI gives is often NOT YET —
          and when it arrives, it arrives with a map, not a door in your face.
        </p>
        <p className="mt-4 max-w-md font-display text-xl text-light">
          Build First is not failure. It is the map.
        </p>
        <Link href="/method" className="btn btn-ghost mt-8">
          How the verdicts protect you
        </Link>
      </div>
    </div>
  );
}
