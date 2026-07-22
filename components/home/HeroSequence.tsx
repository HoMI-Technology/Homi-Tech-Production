"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { CinematicCompass, Particles } from "./CinematicCompass";
import { Compass3D } from "./Compass3D";

/**
 * The first 8 seconds — a mandatory cinematic sequence, resolving into
 * an editorial split hero.
 *
 *   0.0–1.0s  deep navy field, grain, cyan rim light emerges
 *   1.0–2.0s  compass materializes: outer → middle → inner (1s stagger)
 *   2.0–3.0s  keyhole + halo · "Before you leap…"
 *   3.0–4.5s  wordmark · "Will you be okay?"
 *   4.5–6.0s  three floating signals connect to their rings
 *   6.0–8.0s  the scene resolves: copy takes the left column, the
 *             instrument takes the right — headline, category, CTAs
 *
 * Reduced motion or a returning visitor this session jumps straight to
 * the resolved state. Meaning never depends on the animation.
 */

const STAGE_TIMES = [1000, 2000, 3000, 4500, 6000] as const; // → stages 1..5

export function HeroSequence() {
  const [stage, setStage] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = sessionStorage.getItem("homi:hero-seen") === "1";
    if (reduced || seen) {
      setStage(5);
      return;
    }
    const timers = STAGE_TIMES.map((t, idx) => setTimeout(() => setStage(idx + 1), t));
    const done = setTimeout(() => sessionStorage.setItem("homi:hero-seen", "1"), 8000);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, []);

  // Camera pull-back: as the reader scrolls away, the scene recedes —
  // scales down slightly and dims, like a crane shot leaving the room.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = heroRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const t = Math.min(1, window.scrollY / (window.innerHeight * 0.9));
        el.style.opacity = `${1 - t * 0.65}`;
        el.style.transform = `scale(${1 - t * 0.045}) translateY(${t * -18}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const resolved = stage >= 5;
  const on = (threshold: number) => (stage >= threshold ? "is-on" : "");

  return (
    <section
      ref={heroRef}
      className="hero-field hero-deep relative flex min-h-[96vh] items-center overflow-hidden px-6 pb-16 pt-24"
      style={{ transformOrigin: "50% 30%", willChange: "transform, opacity" }}
    >
      <Particles />
      <div className="aurora-band" aria-hidden />
      <div className={`beam ${resolved ? "go" : ""}`} aria-hidden />

      {/* ── Phase A · the cinematic build-up (crossfades out) ────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{
          opacity: resolved ? 0 : 1,
          transition: "opacity 700ms ease",
          pointerEvents: "none",
          visibility: resolved ? "hidden" : "visible",
          transitionProperty: "opacity, visibility",
          transitionDelay: resolved ? "0ms, 700ms" : "0ms",
        }}
        aria-hidden={resolved}
      >
        <div className="compass-float w-[240px] sm:w-[300px]">
          <CinematicCompass responsive stagger materialized={stage >= 1} keyholePulse={stage >= 2} />
        </div>
        <p className={`stage-item ${on(2)} mt-10 text-sm uppercase tracking-[0.25em] text-dim`}>
          Before you leap…
        </p>
        <div className={`stage-item ${on(3)} mt-4`}>
          <Wordmark size="text-5xl sm:text-6xl" />
        </div>
        <p className={`stage-item ${on(3)} mt-4 font-display text-2xl text-light sm:text-3xl`}>
          Will you be okay?
        </p>
      </div>

      {/* ── Phase B · the resolved editorial hero ────────────────── */}
      <div
        className="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]"
        style={{
          opacity: resolved ? 1 : 0,
          transition: "opacity 900ms cubic-bezier(0.16,1,0.3,1) 350ms",
          pointerEvents: resolved ? "auto" : "none",
        }}
        aria-hidden={!resolved}
      >
        {/* Copy column — three elements. Emptiness is the luxury. */}
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan" style={{ boxShadow: "0 0 8px #22d3ee" }} />
            Decision Readiness Intelligence™
          </span>

          <h1 className="type-giant mt-8 font-display font-semibold">
            <span className={`text-shine ${resolved ? "go" : ""}`}>Will you</span>
            <br />
            <span
              style={{
                background: "linear-gradient(105deg, #e2e8f0 20%, #6ee7c8 65%, #34d399 90%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              be okay
            </span>
            <span style={{ color: "#facc15" }}>?</span>
          </h1>

          <p className="mx-auto mt-7 max-w-md text-lg leading-relaxed text-dim lg:mx-0 sm:text-xl">
            Credit scores look backward.{" "}
            <span className="font-semibold text-light">HōMI looks at readiness now.</span>
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start sm:justify-center">
            <Link href="/shadow-score" className="btn btn-primary btn-glow px-9 py-4 text-base">
              See Your Readiness
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M2 8h11m0 0L9 4m4 4l-4 4" />
              </svg>
            </Link>
            <Link href="/advisor" className="btn btn-ghost px-8 py-3.5 text-base">
              Talk to the Companion
            </Link>
          </div>

          <p className="mt-6 text-xs text-dim/70">
            Your homie, not your banker · Free · ~3 minutes · No credit pull
          </p>
        </div>

        {/* Instrument — massive, lit from behind by the horizon */}
        <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
          <div className="compass-float relative">
            <div
              aria-hidden
              className="horizon"
              style={{ inset: "-18%" }}
            />
            <Compass3D size={0} className="aspect-square w-[270px] sm:w-[400px] lg:w-[520px] xl:w-[600px]">
              <Signal
                label="Financial Reality"
                color="#22d3ee"
                className="absolute left-2 top-8 -translate-x-full is-on"
              />
              <Signal
                label="Emotional Truth"
                color="#34d399"
                className="absolute right-4 top-32 translate-x-full is-on"
              />
              <Signal
                label="Perfect Timing"
                color="#facc15"
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full is-on"
              />
            </Compass3D>
          </div>
        </div>
      </div>
    </section>
  );
}

function Signal({ label, color, className }: { label: string; color: string; className: string }) {
  return (
    <span
      className={`stage-item ${className} hidden items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium text-light backdrop-blur-sm lg:inline-flex`}
      style={{ borderColor: `${color}55`, background: "rgba(15,23,42,0.6)" }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {label}
    </span>
  );
}
