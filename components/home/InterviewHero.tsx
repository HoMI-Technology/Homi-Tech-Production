"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CinematicCompass, Particles } from "./CinematicCompass";
import { track } from "@/lib/analytics";
import { COLORS, withAlpha } from "@/lib/brand";

/**
 * InterviewHero — landing hook (PERSUADE).
 * Redesign-preserve under DESIGN.md: navy/cyan/Fraunces brand lock, compass
 * instrument, 3-signal interview. Taste pass: fit the fold, asymmetric split
 * at lg+, no decorative kicker dots, one clear primary path, quieter chrome.
 *
 * SEO/AT: h1 is in the DOM from first paint at full contrast.
 */

export const HERO_VARIANT: "interview" | "film" = "interview";

type Signal = 0 | 1 | 2 | 3;

interface Signals {
  financial: Signal | null;
  emotional: Signal | null;
  timing: Signal | null;
}

type Temperature = "COOL" | "WARM" | "WARM_PLUS" | "HOT";

/** Color stays code (design canon), alongside the verdict label and copy. */
const TEMPERATURE_META: Record<Temperature, { label: string; copy: string; color: string }> = {
  COOL: {
    label: "Running cool",
    copy: "You’re running cool. Steady signals across all three. The full read confirms it in three minutes.",
    color: COLORS.emerald,
  },
  WARM: {
    label: "Running warm",
    copy: "You’re running warm. Close: one signal needs attention before you leap.",
    color: COLORS.yellow,
  },
  WARM_PLUS: {
    label: "Running warm+",
    copy: "You’re running warm+. Something needs building first. That is not a wall. It is a map.",
    color: COLORS.amber,
  },
  HOT: {
    label: "Running hot",
    copy: "You’re running hot. This is a protection signal. Slow down before pressure makes the decision for you.",
    color: COLORS.crimson,
  },
};

function computeTemperature(s: { financial: Signal; emotional: Signal; timing: Signal }): Temperature {
  const values = [s.financial, s.emotional, s.timing];
  const sum = values[0] + values[1] + values[2];
  const hasZero = values.includes(0);
  const hasOne = values.includes(1);

  let temp: Temperature;
  if (sum >= 8) temp = "COOL";
  else if (sum >= 6) temp = "WARM";
  else if (sum >= 3) temp = "WARM_PLUS";
  else temp = "HOT";

  const rank: Record<Temperature, number> = { HOT: 0, WARM_PLUS: 1, WARM: 2, COOL: 3 };
  if (hasZero && rank[temp] > rank.WARM_PLUS) temp = "WARM_PLUS";
  else if (hasOne && rank[temp] > rank.WARM) temp = "WARM";

  return temp;
}

const SESSION_SIGNALS_KEY = "homi:hero-signals";
const SESSION_DONE_KEY = "homi:hero-done";

interface Question {
  id: "financial" | "emotional" | "timing";
  prompt: string;
  ringColor: string;
  announce: string;
  event: string;
  chips: { label: string; value: Signal }[];
}

const QUESTIONS: Question[] = [
  {
    id: "financial",
    prompt: "If you lost your income tomorrow — how many months could you cover?",
    ringColor: COLORS.cyan,
    announce: "Financial Reality signal set.",
    event: "hero_q1_answered",
    chips: [
      { label: "Under a month", value: 0 },
      { label: "1–3 months", value: 1 },
      { label: "3–6 months", value: 2 },
      { label: "6+ months", value: 3 },
    ],
  },
  {
    id: "emotional",
    prompt: "How much of this decision is driven by what YOU want — versus pressure from around you?",
    ringColor: COLORS.emerald,
    announce: "Emotional Truth signal set.",
    event: "hero_q2_answered",
    chips: [
      { label: "All outside", value: 0 },
      { label: "Mostly outside", value: 1 },
      { label: "Mostly me", value: 2 },
      { label: "From me", value: 3 },
    ],
  },
  {
    id: "timing",
    prompt: "If you waited 12 months, what would likely change?",
    ringColor: COLORS.yellow,
    announce: "Perfect Timing signal set.",
    event: "hero_q3_answered",
    chips: [
      { label: "Everything’s blocked on now", value: 0 },
      { label: "Prices might run away", value: 1 },
      { label: "I’d save more, same goal", value: 2 },
      { label: "Little — I’m choosing the moment", value: 3 },
    ],
  },
];

export function InterviewHero() {
  const questions = QUESTIONS;
  const [signals, setSignals] = useState<Signals>({ financial: null, emotional: null, timing: null });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [settled, setSettled] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const doneFlagSet = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduced);

    const done = sessionStorage.getItem(SESSION_DONE_KEY) === "1";
    if (done || reduced) {
      try {
        const raw = sessionStorage.getItem(SESSION_SIGNALS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Signals>;
          setSignals({
            financial: (parsed.financial ?? 3) as Signal,
            emotional: (parsed.emotional ?? 3) as Signal,
            timing: (parsed.timing ?? 3) as Signal,
          });
        } else if (done) {
          setSignals({ financial: 3, emotional: 3, timing: 3 });
        }
      } catch {
        // ignore
      }
      if (done) setSettled(true);
    }
    setHydrated(true);
  }, []);

  const answeredCount = [signals.financial, signals.emotional, signals.timing].filter((v) => v !== null).length;
  const allAnswered = signals.financial !== null && signals.emotional !== null && signals.timing !== null;

  const temperature = useMemo(() => {
    if (!allAnswered) return null;
    return computeTemperature({
      financial: signals.financial as Signal,
      emotional: signals.emotional as Signal,
      timing: signals.timing as Signal,
    });
  }, [allAnswered, signals]);

  useEffect(() => {
    if (allAnswered && temperature && !doneFlagSet.current) {
      doneFlagSet.current = true;
      track("hero_temperature_shown");
      try {
        sessionStorage.setItem(SESSION_DONE_KEY, "1");
      } catch {
        // ignore
      }
    }
  }, [allAnswered, temperature]);

  function answer(question: Question, value: Signal) {
    setSignals((prev) => {
      const next = { ...prev, [question.id]: value };
      try {
        sessionStorage.setItem(
          SESSION_SIGNALS_KEY,
          JSON.stringify({
            financial: next.financial,
            emotional: next.emotional,
            timing: next.timing,
          }),
        );
      } catch {
        // ignore
      }
      return next;
    });
    setAnnouncement(question.announce);
    track(question.event);
  }

  const activeQuestion = questions.find((q) => signals[q.id] === null) ?? null;
  const activeIndex = activeQuestion
    ? questions.findIndex((q) => q.id === activeQuestion.id)
    : questions.length - 1;

  const ignited = {
    financial: signals.financial !== null,
    emotional: signals.emotional !== null,
    timing: signals.timing !== null,
  };

  const glow = {
    outer: ignited.financial ? 1.4 : 0.06,
    middle: ignited.emotional ? 1.3 : 0.06,
    inner: ignited.timing ? 1.2 : 0.06,
  };

  const floorPoolOpacity = 0.08 + answeredCount * 0.09;
  const showQuestions = !settled;

  function handleCtaClick() {
    track("hero_cta_click");
  }

  // reducedMotion is read so returning visitors with PRM still hydrate settled state;
  // compass motion is already gated inside child components / CSS.
  void reducedMotion;

  return (
    <section className="hero-deep hero-field relative flex min-h-[100dvh] flex-col justify-center overflow-hidden px-5 pb-12 pt-20 sm:px-6 sm:pb-14 sm:pt-20 lg:pt-24">
      <Particles />
      <div className="aurora-band" aria-hidden />

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:text-left">
        {/* Instrument — mobile first (visual anchor), desktop right */}
        <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
          <div className="relative flex w-full max-w-[320px] flex-col items-center sm:max-w-[380px]">
            <div
              aria-hidden
              className="horizon"
              style={{ width: "78%", height: "78%", left: "11%", top: "6%" }}
            />
            <div className="compass-float relative w-[200px] sm:w-[280px] lg:w-[320px]">
              <CinematicCompass responsive glow={glow} materialized keyholePulse={answeredCount > 0} />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[72%] h-20 w-[220px] -translate-x-1/2 rounded-[50%] sm:w-[300px]"
              style={{
                background:
                  `radial-gradient(ellipse at center, ${withAlpha(COLORS.cyan, 0.32)}, ${withAlpha(COLORS.emerald, 0.12)} 45%, transparent 75%)`,
                opacity: floorPoolOpacity,
                transition: "opacity 900ms ease",
                filter: "blur(6px)",
              }}
            />
          </div>
        </div>

        {/* Thesis + interview */}
        <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
          <p className="type-kicker text-cyan/90">
            Decision Readiness Intelligence™
          </p>

          <h1
            className="type-display mt-4 max-w-[14ch] sm:max-w-none"
            style={{ textWrap: "balance" }}
          >
            Know when you&rsquo;re ready.
          </h1>

          <p className="mt-3 max-w-[36ch] text-sm leading-relaxed text-dim sm:text-base lg:max-w-md">
            A credit score estimates repayment risk. HōMI helps you evaluate readiness for the
            decision itself.
          </p>

          {/* Semantic progress: which of 3 signals is active */}
          {showQuestions && !(hydrated && settled) && (
            <ol
              className="mt-6 flex items-center gap-2"
              aria-label={`Signal ${Math.min(activeIndex + 1, 3)} of 3`}
            >
              {questions.map((q, i) => {
                const done = signals[q.id] !== null;
                const active = activeQuestion?.id === q.id;
                return (
                  <li key={q.id}>
                    <span
                      className="block h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: active ? "1.75rem" : "0.75rem",
                        background: done || active ? q.ringColor : withAlpha(COLORS.dim, 0.28),
                        opacity: done || active ? 1 : 0.7,
                      }}
                      aria-current={active ? "step" : undefined}
                    />
                  </li>
                );
              })}
            </ol>
          )}

          <div className="relative mt-6 flex min-h-[200px] w-full max-w-xl flex-col items-center justify-center lg:items-start">
            {!(hydrated && settled) && showQuestions && activeQuestion && (
              <div key={activeQuestion.id} className="w-full">
                <p className="font-display text-lg leading-snug text-light sm:text-xl">
                  {activeQuestion.prompt}
                </p>
                <div
                  role="group"
                  aria-label={activeQuestion.prompt}
                  className="mt-5 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start"
                >
                  {activeQuestion.chips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => answer(activeQuestion, chip.value)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-high/50 bg-navy-light/70 px-4 py-2 text-sm font-medium text-light transition-[border-color,background-color,color,transform] duration-150 hover:border-cyan/55 hover:bg-slate-surface/60 hover:text-cyan active:scale-[0.98]"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs text-dim/75">Your answers aren&rsquo;t stored or sent.</p>
              </div>
            )}

            {hydrated && (settled || allAnswered) && temperature && (
              <div className="stage-item is-on flex w-full flex-col items-center lg:items-start">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-2xs font-bold uppercase tracking-[0.12em]"
                  style={{
                    color: TEMPERATURE_META[temperature].color,
                    borderColor: `${TEMPERATURE_META[temperature].color}55`,
                    background: `${TEMPERATURE_META[temperature].color}12`,
                  }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      background: TEMPERATURE_META[temperature].color,
                      boxShadow: `0 0 8px ${TEMPERATURE_META[temperature].color}`,
                    }}
                    aria-hidden
                  />
                  {TEMPERATURE_META[temperature].label}
                </span>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-light/95 sm:text-base">
                  {TEMPERATURE_META[temperature].copy}
                </p>
                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                  <Link
                    href="/shadow-score"
                    className="btn btn-primary btn-glow px-8 py-3.5 text-base"
                    onClick={handleCtaClick}
                  >
                    Check my readiness
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M2 8h11m0 0L9 4m4 4l-4 4" />
                    </svg>
                  </Link>
                  <a
                    href="#statement"
                    className="text-sm text-dim underline-offset-4 transition-colors hover:text-light hover:underline"
                  >
                    Just exploring
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
