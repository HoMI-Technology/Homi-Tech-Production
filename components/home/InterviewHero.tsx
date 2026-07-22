"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CinematicCompass, Particles } from "./CinematicCompass";
import { track } from "@/lib/analytics";

/**
 * InterviewHero — the hero is a 3-question cinematic interview held in a
 * dark room. The compass ignites one ring per answer; at the end, a
 * temperature verdict (not a score) points the reader either to the
 * full assessment or lets them keep exploring.
 *
 * SEO/AT: the h1 is in the DOM from first paint (low opacity, not
 * display:none) so it is always crawlable and announced.
 */

export const HERO_VARIANT: "interview" | "film" = "interview";

type Signal = 0 | 1 | 2 | 3;

interface Signals {
  financial: Signal | null;
  emotional: Signal | null;
  timing: Signal | null;
}

type Temperature = "COOL" | "WARM" | "WARM_PLUS" | "HOT";

/** Color stays code (design canon); label/copy come from messages.{en,es}. */
const TEMPERATURE_META: Record<Temperature, { messageKey: string; color: string }> = {
  COOL: { messageKey: "cool", color: "#34d399" },
  WARM: { messageKey: "warm", color: "#facc15" },
  WARM_PLUS: { messageKey: "warmPlus", color: "#fab633" },
  HOT: { messageKey: "hot", color: "#f24822" },
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

  // Caps: a 0 anywhere caps at WARM_PLUS; a 1 anywhere (no 0) caps at WARM.
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

/** Static per-question config; prompt/announce/chip labels come from messages. */
const QUESTION_META: { id: Question["id"]; ringColor: string; event: string }[] = [
  { id: "financial", ringColor: "#22d3ee", event: "hero_q1_answered" },
  { id: "emotional", ringColor: "#34d399", event: "hero_q2_answered" },
  { id: "timing", ringColor: "#facc15", event: "hero_q3_answered" },
];

export function InterviewHero() {
  const t = useTranslations("home.hero");
  const questions = useMemo<Question[]>(
    () =>
      QUESTION_META.map((meta) => ({
        ...meta,
        prompt: t(`questions.${meta.id}.prompt`),
        announce: t(`questions.${meta.id}.announce`),
        chips: (t.raw(`questions.${meta.id}.chips`) as string[]).map((label, value) => ({
          label,
          value: value as Signal,
        })),
      })),
    [t],
  );
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
      // Try to restore prior answers for a fully-lit settled state.
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
          })
        );
      } catch {
        // ignore
      }
      return next;
    });
    setAnnouncement(question.announce);
    track(question.event);
  }

  // Which question is "active" (first unanswered).
  const activeQuestion = questions.find((q) => signals[q.id] === null) ?? null;

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

  // Headline stays at full contrast from first paint (WCAG AA). The interview
  // reveal is carried by ring ignition + question cards, not by dimming the h1.
  const floorPoolOpacity = 0.08 + answeredCount * 0.09;

  const showQuestions = !settled;

  function handleCtaClick() {
    track("hero_cta_click");
  }

  return (
    <section className="hero-deep hero-field relative flex min-h-[96vh] flex-col items-center overflow-hidden px-6 pb-16 pt-28">
      <Particles />
      <div className="aurora-band" aria-hidden />

      {/* Announcer for ring ignitions */}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        {/* Kicker chip */}
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan" style={{ boxShadow: "0 0 8px #22d3ee" }} />
          {t("kicker")}
        </span>

        {/* Compass + floor pool + reflection */}
        <div className="relative mt-10 flex w-full flex-col items-center">
          <div
            aria-hidden
            className="horizon"
            style={{ width: "70%", height: "70%", left: "15%", top: "10%" }}
          />
          <div className="compass-float relative w-[220px] sm:w-[300px]">
            <CinematicCompass responsive glow={glow} materialized keyholePulse={answeredCount > 0} />
          </div>

          {/* Floor pool */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[78%] h-24 w-[260px] -translate-x-1/2 rounded-[50%] sm:w-[340px]"
            style={{
              background: "radial-gradient(ellipse at center, rgba(34,211,238,0.35), rgba(52,211,153,0.15) 45%, transparent 75%)",
              opacity: floorPoolOpacity,
              transition: "opacity 900ms ease",
              filter: "blur(6px)",
            }}
          />

          {/* Reflection — blurred, flipped, low-opacity copy of the compass */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-full w-[220px] -translate-x-1/2 sm:w-[300px]"
            style={{
              transform: "scaleY(-1)",
              opacity: 0.16,
              filter: "blur(3px)",
              maskImage: "linear-gradient(to bottom, black, transparent 70%)",
              WebkitMaskImage: "linear-gradient(to bottom, black, transparent 70%)",
            }}
          >
            <CinematicCompass responsive glow={glow} materialized />
          </div>
        </div>

        {/* h1 — always in the DOM at full contrast (never opacity-dimmed) */}
        <h1
          className="type-giant relative z-10 mt-12 font-display font-semibold text-light"
          style={{ whiteSpace: "normal" }}
        >
          {t("h1")}
        </h1>

        <p className="mt-4 max-w-md text-base text-dim sm:text-lg">
          {t("sub")}
        </p>

        {/* Question card area — fixed min-height to avoid CLS. Rendered
            server-side AND visible from first paint (it is the LCP-adjacent
            content; hiding it until hydration blew the §11 LCP budget).
            The settled state (once hydrated) swaps it out for returning
            visitors — a brief question flash for them beats an invisible
            hero for every first-time visitor. */}
        <div className="relative mt-10 flex min-h-[220px] w-full max-w-xl flex-col items-center justify-center">
          {!(hydrated && settled) && showQuestions && activeQuestion && (
            <div key={activeQuestion.id} className="w-full">
              <p className="font-display text-xl leading-snug text-light sm:text-2xl">
                {activeQuestion.prompt}
              </p>
              <div
                role="group"
                aria-label={activeQuestion.prompt}
                className="mt-6 flex flex-wrap items-center justify-center gap-3"
              >
                {activeQuestion.chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => answer(activeQuestion, chip.value)}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-slate-high/60 bg-navy-light/60 px-5 text-sm font-medium text-light transition-colors hover:border-cyan/60 hover:text-cyan"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <p className="mt-5 text-xs text-dim/70">{t("note")}</p>
            </div>
          )}

          {hydrated && (settled || allAnswered) && temperature && (
            <div className="stage-item is-on flex w-full flex-col items-center">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
                style={{
                  color: TEMPERATURE_META[temperature].color,
                  borderColor: `${TEMPERATURE_META[temperature].color}55`,
                  background: `${TEMPERATURE_META[temperature].color}12`,
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: TEMPERATURE_META[temperature].color, boxShadow: `0 0 8px ${TEMPERATURE_META[temperature].color}` }}
                />
                {t(`temps.${TEMPERATURE_META[temperature].messageKey}.label`)}
              </span>
              <p className="mt-4 max-w-md text-base leading-relaxed text-light sm:text-lg">
                {t(`temps.${TEMPERATURE_META[temperature].messageKey}.copy`)}
              </p>
              <div className="mt-7 flex flex-col items-center gap-4">
                <Link
                  href="/shadow-score"
                  className="btn btn-primary btn-glow px-9 py-4 text-base"
                  onClick={handleCtaClick}
                >
                  {t("cta")}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M2 8h11m0 0L9 4m4 4l-4 4" />
                  </svg>
                </Link>
                <a href="#statement" className="text-sm text-dim underline-offset-4 hover:text-light hover:underline">
                  {t("exploring")}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
