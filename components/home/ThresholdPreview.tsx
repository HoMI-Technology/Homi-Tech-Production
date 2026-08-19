"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL,
} from "@/components/marketing/first-moment-copy";
import { CinematicCompass } from "./CinematicCompass";
import { COLORS } from "@/lib/brand";

/**
 * Threshold Preview — a public-safe, interactive feel for live readiness.
 *
 * Three signals, one temperature. Chrome never presents a 0 to 100 numeral
 * as a HōMI-Score and never pins a 4-band verdict badge on the visitor.
 */

type PreviewTemp = "Cool" | "Warm" | "Warm+" | "Hot";

const TEMPS: Record<
  PreviewTemp,
  {
    color: string;
    temperature: string;
    message: string;
  }
> = {
  Cool: {
    color: COLORS.emerald,
    temperature: "Cool",
    message: "Your signals appear favorable. Move with clarity, not pressure.",
  },
  Warm: {
    color: COLORS.yellow,
    temperature: "Warm",
    message: "You are close. One signal still needs attention.",
  },
  "Warm+": {
    color: COLORS.amber,
    temperature: "Warm+",
    message: "Not yet is not no.",
  },
  Hot: {
    color: COLORS.crimson,
    temperature: "Hot",
    message: "This is a protection signal. Slow down before pressure makes the decision for you.",
  },
};

const SIGNALS = [
  {
    key: "financial" as const,
    name: "Financial Reality",
    color: COLORS.cyan,
    ask: "Can you absorb this decision without destabilizing your foundation?",
  },
  {
    key: "emotional" as const,
    name: "Emotional Truth",
    color: COLORS.emerald,
    ask: "Are you choosing from clarity, or from pressure?",
  },
  {
    key: "timing" as const,
    name: "Perfect Timing",
    color: COLORS.yellow,
    ask: "Does this moment support the decision?",
  },
];

function toTemp(score: number): PreviewTemp {
  if (score >= 80) return "Cool";
  if (score >= 65) return "Warm";
  if (score >= 50) return "Warm+";
  return "Hot";
}

function signalTemperature(value: number): string {
  if (value >= 80) return "Cool";
  if (value >= 65) return "Warm";
  if (value >= 50) return "Warm+";
  return "Hot";
}

export function ThresholdPreview() {
  const [values, setValues] = useState({ financial: 74, emotional: 86, timing: 68 });

  const score = useMemo(
    () => Math.round((values.financial + values.emotional + values.timing) / 3),
    [values],
  );
  const tempKey = toTemp(score);
  const temp = TEMPS[tempKey];
  const weakest = SIGNALS.reduce((a, b) => (values[a.key] <= values[b.key] ? a : b));
  const needsPath = tempKey === "Warm+" || tempKey === "Hot";

  return (
    <div className="glass grid gap-10 p-8 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col items-center justify-center">
        <div className={tempKey === "Cool" ? "keyhole-glint" : undefined}>
          <CinematicCompass
            size={260}
            glow={{
              outer: 0.45 + (values.financial / 100) * 0.75,
              middle: 0.45 + (values.emotional / 100) * 0.75,
              inner: 0.45 + (values.timing / 100) * 0.75,
            }}
            keyholePulse={tempKey === "Cool"}
          />
        </div>
        <div className="mt-6 text-center" aria-live="polite">
          <p className="text-xs uppercase tracking-[0.25em] text-dim">Temperature</p>
          <p
            className="mt-2 font-display text-5xl font-bold"
            style={{ color: temp.color, transition: "color 400ms ease" }}
          >
            {temp.temperature}
          </p>
          <p className="mt-2 text-xs text-dim/70">Illustration — not a HōMI-Score</p>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-dim">
            {temp.message}
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-7">
        {SIGNALS.map((s) => (
          <div key={s.key}>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor={`tp-${s.key}`} className="text-sm font-semibold text-light">
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ background: s.color }}
                />
                {s.name}
              </label>
              <span className="text-sm text-dim">{signalTemperature(values[s.key])}</span>
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

        <div
          className="rounded-xl border p-4 text-sm leading-relaxed"
          style={{
            borderColor: `${temp.color}44`,
            background: `${temp.color}0d`,
            transition: "all 400ms ease",
          }}
          aria-live="polite"
        >
          {needsPath ? (
            <>
              <p className="font-semibold" style={{ color: temp.color }}>
                Not yet is not no.
              </p>
              <p className="mt-1 text-dim">
                Readiness path: strengthen {weakest.name} before crossing the threshold. This is the
                part we build first.
              </p>
            </>
          ) : tempKey === "Warm" ? (
            <p className="text-dim">
              <span className="font-semibold text-yellow">One signal is still warm.</span>{" "}
              Strengthen {weakest.name} and the compass turns.
            </p>
          ) : (
            <p className="text-dim">
              <span className="font-semibold text-emerald">All three rings align.</span> When they
              truly align, your compass becomes a key.
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-2">
          <Link href={PRIMARY_CLOSE_HREF} className="btn btn-primary">
            {PRIMARY_CLOSE_LABEL}
          </Link>
          <p className="text-xs text-dim/70">
            This preview uses illustrative signals only — temperature, not a HōMI-Score. Your real
            read comes from the full assessment.
          </p>
        </div>
      </div>
    </div>
  );
}
