"use client";

import { useEffect, useRef, useState } from "react";
import { CinematicCompass } from "./CinematicCompass";
import { COLORS, withAlpha } from "@/lib/brand";

/**
 * The alignment scene — pinned cinema. The compass locks to the screen
 * while the reader scrolls; each movement of scroll lights one ring:
 * Financial Reality, then Emotional Truth, then Perfect Timing — and
 * when all three burn together, the keyhole turns emerald. The reader
 * doesn't watch alignment happen. They scroll it into existence.
 *
 * Implementation: CSS `position: sticky` on `.pin-stage` inside a tall
 * `.pin-scene` (strategy a — correct the custom pin, no GSAP). Scroll
 * progress is derived from the scene's bounding rect. Requires no
 * `overflow: hidden` ancestor on `body` (see `overflow-x: clip` in
 * globals.css) or sticky collapses and the stage scrolls away, leaving
 * blank navy for most of the pin range.
 *
 * Reduced motion: renders as four stacked, fully-visible panels.
 */

const STEPS = [
  {
    kicker: "The first ring",
    color: COLORS.cyan,
    title: "Financial Reality",
    line: "Can you absorb this decision without destabilizing your foundation?",
  },
  {
    kicker: "The second ring",
    color: COLORS.emerald,
    title: "Emotional Truth",
    line: "Are you choosing from clarity, or from pressure?",
  },
  {
    kicker: "The third ring",
    color: COLORS.yellow,
    title: "Perfect Timing",
    line: "Does this moment support the decision?",
  },
  {
    kicker: "Alignment",
    color: COLORS.emerald,
    title: "The compass becomes a key",
    line: "When all three align — truly align — that's when you're ready.",
  },
];

export function AlignmentScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    const el = sceneRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const total = Math.max(1, r.height - window.innerHeight);
        const progress = Math.max(0, Math.min(1, -r.top / total));
        setStep(Math.min(3, Math.floor(progress * 4)));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const active = STEPS[step];
  const glow = {
    outer: step >= 0 ? (step === 0 ? 1.7 : step === 3 ? 1.5 : 0.9) : 0.4,
    middle: step >= 1 ? (step === 1 ? 1.6 : step === 3 ? 1.5 : 0.9) : 0.35,
    inner: step >= 2 ? (step === 2 ? 1.5 : step === 3 ? 1.5 : 0.9) : 0.35,
  };

  if (reduced) {
    return (
      <div className="flex flex-col gap-12 px-6 py-24">
        {STEPS.map((s) => (
          <div key={s.title} className="mx-auto max-w-2xl text-center">
            <p className="type-kicker" style={{ color: s.color }}>
              {s.kicker}
            </p>
            <h3 className="mt-3 font-display text-4xl font-semibold text-light">{s.title}</h3>
            <p className="mt-3 text-lg text-dim">{s.line}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={sceneRef} className="pin-scene">
      <div
        className="pin-stage hero-deep"
        data-step={step}
        data-testid="alignment-pin-stage"
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Horizon light behind the pinned instrument */}
        <div
          aria-hidden
          className="horizon"
          style={{
            width: "56vmin",
            height: "56vmin",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            opacity: step === 3 ? 1 : 0.55,
            background:
              step === 3
                ? `radial-gradient(ellipse at center, ${withAlpha(COLORS.emerald, 0.5)}, ${withAlpha(COLORS.emerald, 0.1)} 40%, transparent 70%)`
                : undefined,
            transition: "all 800ms ease",
          }}
        />

        {/* Two-column + giant type only from xl — at lg/1024×768 the side-by-side
            compass + text-6xl clip under .pin-stage { overflow: hidden }. */}
        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-6 px-6 py-8 sm:gap-10 xl:grid-cols-2 xl:py-0">
          <div className="flex justify-center">
            <div className="w-[200px] sm:w-[280px] md:w-[320px] xl:w-[440px]">
              <CinematicCompass
                responsive
                glow={glow}
                keyholePulse={step === 3}
              />
            </div>
          </div>

          <div className="relative min-h-[160px] text-center sm:min-h-[200px] xl:min-h-[220px] xl:text-left">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="pin-step absolute inset-0 flex flex-col justify-center"
                style={{
                  opacity: i === step ? 1 : 0,
                  transform:
                    i === step
                      ? "translateY(0)"
                      : i < step
                        ? "translateY(-16px)"
                        : "translateY(16px)",
                  pointerEvents: i === step ? "auto" : "none",
                }}
                aria-hidden={i !== step}
              >
                <p className="type-kicker" style={{ color: s.color }}>
                  {s.kicker}
                </p>
                <h3 className="mt-3 font-display text-3xl font-semibold leading-tight text-light sm:mt-4 sm:text-4xl xl:text-6xl">
                  {s.title}
                </h3>
                <p className="mt-3 max-w-md text-base leading-relaxed text-dim sm:mt-4 sm:text-lg xl:mt-5 xl:pr-6 mx-auto xl:mx-0">
                  {s.line}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress ticks — four-dot indicator synced to visible step */}
        <div
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-8"
          aria-hidden
        >
          {STEPS.map((s, i) => (
            <span
              key={i}
              className="h-1 w-8 rounded-full transition-all duration-500"
              style={{ background: i <= step ? active.color : withAlpha(COLORS.slateHigh, 0.7) }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
