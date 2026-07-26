"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { CinematicCompass } from "./CinematicCompass";

/** Tweens a number toward its target — cinema, not snapping. */
function useTweened(target: number, ms = 450): number {
  const [value, setValue] = useState(target);
  const raf = useRef(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const from = value;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);
  return value;
}

/**
 * Threshold Preview — a public-safe, interactive feel for live readiness.
 *
 * Three signals, one score, a verdict that changes temperature as you
 * move. This module deliberately uses a plain average of the three
 * illustrative signals: no proprietary weights, no sub-factor logic,
 * no scoring internals. The real HōMI-Score comes from the full
 * assessment. Verdict bands shown here are the published public bands.
 */

type PreviewVerdict = "READY" | "ALMOST_THERE" | "BUILD_FIRST" | "DO_NOT_PROCEED";

const VERDICTS: Record<
  PreviewVerdict,
  { label: string; color: string; temperature: string; message: string; engineKey: "READY" | "ALMOST_THERE" | "BUILD_FIRST" | "NOT_YET" }
> = {
  READY: {
    label: "READY",
    color: "#34d399",
    temperature: "Cool",
    message: "Your signals appear favorable. Move with clarity, not pressure.",
    engineKey: "READY",
  },
  ALMOST_THERE: {
    label: "ALMOST THERE",
    color: "#facc15",
    temperature: "Warm",
    message: "You are close. One signal still needs attention.",
    engineKey: "ALMOST_THERE",
  },
  BUILD_FIRST: {
    label: "BUILD FIRST",
    color: "#fab633",
    temperature: "Warm+",
    message: "Build First is not failure. It is the map.",
    engineKey: "BUILD_FIRST",
  },
  DO_NOT_PROCEED: {
    label: "DO NOT PROCEED",
    color: "#f24822",
    temperature: "Hot",
    message: "This is a protection signal. Slow down before pressure makes the decision for you.",
    engineKey: "NOT_YET",
  },
};

const SIGNALS = [
  { key: "financial" as const, name: "Financial Reality", color: "#22d3ee", ask: "Can you absorb this decision without destabilizing your foundation?" },
  { key: "emotional" as const, name: "Emotional Truth", color: "#34d399", ask: "Are you choosing from clarity, or from pressure?" },
  { key: "timing" as const, name: "Perfect Timing", color: "#facc15", ask: "Does this moment support the decision?" },
];

function toVerdict(score: number): PreviewVerdict {
  if (score >= 80) return "READY";
  if (score >= 65) return "ALMOST_THERE";
  if (score >= 50) return "BUILD_FIRST";
  return "DO_NOT_PROCEED";
}

export function ThresholdPreview() {
  const [values, setValues] = useState({ financial: 74, emotional: 86, timing: 68 });

  const score = useMemo(
    () => Math.round((values.financial + values.emotional + values.timing) / 3),
    [values],
  );
  const shownScore = useTweened(score);
  const verdictKey = toVerdict(score);
  const verdict = VERDICTS[verdictKey];
  const weakest = SIGNALS.reduce((a, b) => (values[a.key] <= values[b.key] ? a : b));
  const needsPath = verdictKey === "BUILD_FIRST" || verdictKey === "DO_NOT_PROCEED";

  return (
    <div className="glass grid gap-10 p-8 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
      {/* The instrument responds */}
      <div className="flex flex-col items-center justify-center">
        <div className={verdictKey === "READY" ? "keyhole-glint" : undefined}>
          <CinematicCompass
            size={260}
            glow={{
              outer: 0.45 + (values.financial / 100) * 0.75,
              middle: 0.45 + (values.emotional / 100) * 0.75,
              inner: 0.45 + (values.timing / 100) * 0.75,
            }}
            verdict={verdict.engineKey}
            keyholePulse={verdictKey === "READY"}
          />
        </div>
        <div className="mt-6 text-center" aria-live="polite">
          <p className="text-xs uppercase tracking-[0.25em] text-dim">HōMI-Score</p>
          <p
            className="score-numeral text-6xl font-bold text-light"
            style={{ transition: "color 400ms ease" }}
          >
            {shownScore}
          </p>
          <span
            className="mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold tracking-wide"
            style={{
              color: verdict.color,
              borderColor: `${verdict.color}55`,
              background: `${verdict.color}14`,
              transition: "all 400ms ease",
            }}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: verdict.color, boxShadow: `0 0 8px ${verdict.color}` }} />
            {verdict.label}
            <span className="font-normal opacity-70">· {verdict.temperature}</span>
          </span>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-dim">{verdict.message}</p>
        </div>
      </div>

      {/* The signals */}
      <div className="flex flex-col justify-center gap-7">
        {SIGNALS.map((s) => (
          <div key={s.key}>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor={`tp-${s.key}`} className="text-sm font-semibold text-light">
                <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: s.color }} />
                {s.name}
              </label>
              <span className="score-numeral text-sm text-dim">{values[s.key]}</span>
            </div>
            <input
              id={`tp-${s.key}`}
              type="range"
              min={0}
              max={100}
              value={values[s.key]}
              onChange={(e) => setValues((v) => ({ ...v, [s.key]: Number(e.target.value) }))}
              className="homi-slider"
              style={{ ["--fill" as string]: `${values[s.key]}%` }}
              aria-label={`${s.name} signal`}
            />
            <p className="mt-1.5 text-xs text-dim/80">{s.ask}</p>
          </div>
        ))}

        {/* Protection note / readiness path */}
        <div
          className="rounded-xl border p-4 text-sm leading-relaxed"
          style={{
            borderColor: `${verdict.color}44`,
            background: `${verdict.color}0d`,
            transition: "all 400ms ease",
          }}
          aria-live="polite"
        >
          {needsPath ? (
            <>
              <p className="font-semibold" style={{ color: verdict.color }}>
                Not yet is not no.
              </p>
              <p className="mt-1 text-dim">
                Readiness path: strengthen {weakest.name} before crossing the threshold.
                This is the part we build first.
              </p>
            </>
          ) : verdictKey === "ALMOST_THERE" ? (
            <p className="text-dim">
              <span className="font-semibold text-yellow">One signal is still warm.</span>{" "}
              Strengthen {weakest.name} and the compass turns.
            </p>
          ) : (
            <p className="text-dim">
              <span className="font-semibold text-emerald">All three rings align.</span>{" "}
              When they truly align, your compass becomes a key.
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-2">
          <Link href="/shadow-score" className="btn btn-primary">
            Check my readiness
          </Link>
          <p className="text-xs text-dim/70">
            This preview uses illustrative signals only — no scoring internals. Your real
            HōMI-Score comes from the full assessment.
          </p>
        </div>
      </div>
    </div>
  );
}
