"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Section 3 — the timeline that transforms. On entering the viewport:
 *   Pressure → Decision → Consequence
 * becomes
 *   Pressure → HōMI → Clarity → Decision
 */

function Node({ label, accent, dim }: { label: string; accent?: string; dim?: boolean }) {
  return (
    <span
      className="rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-500"
      style={{
        borderColor: accent ? `${accent}66` : "rgba(148,163,184,0.25)",
        background: accent ? `${accent}12` : "rgba(15,23,42,0.6)",
        color: accent ?? (dim ? "#94a3b8" : "#e2e8f0"),
      }}
    >
      {label}
    </span>
  );
}

function Arrow() {
  return (
    <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden className="shrink-0 text-dim/50">
      <path d="M0 5h22m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function TimelineShift() {
  const ref = useRef<HTMLDivElement>(null);
  const [inserted, setInserted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInserted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          const t = setTimeout(() => setInserted(true), 1100);
          io.disconnect();
          return () => clearTimeout(t);
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center gap-8">
      <div
        className="flex flex-wrap items-center justify-center gap-3 transition-opacity duration-500"
        style={{ opacity: inserted ? 0.35 : 1 }}
        aria-hidden={inserted}
      >
        <Node label="Pressure" dim />
        <Arrow />
        <Node label="Decision" dim />
        <Arrow />
        <Node label="Consequence" accent="#f24822" />
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-3"
        style={{
          opacity: inserted ? 1 : 0,
          transform: inserted ? "translateY(0)" : "translateY(12px)",
          transition: "all 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <Node label="Pressure" dim />
        <Arrow />
        <Node label="HōMI" accent="#22d3ee" />
        <Arrow />
        <Node label="Clarity" accent="#34d399" />
        <Arrow />
        <Node label="Decision" />
      </div>
    </div>
  );
}
