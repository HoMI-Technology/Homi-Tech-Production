"use client";

import { useState } from "react";
import { CinematicCompass } from "./CinematicCompass";

/**
 * Section 7 — the intelligence modes around the compass. Not chatbots,
 * not mascots: six modes of one honest companion. Selecting a mode
 * brightens the compass layer it listens to and reveals one insight.
 */

interface Mode {
  key: string;
  name: string;
  color: string;
  ring: "outer" | "middle" | "inner" | "center";
  role: string;
  insight: string;
}

const MODES: Mode[] = [
  {
    key: "homie",
    name: "Homie",
    color: "#e2e8f0",
    ring: "center",
    role: "Warm companion. No conversion pressure.",
    insight: "I'm not here to move you forward. I'm here to make sure you'll be okay.",
  },
  {
    key: "reality",
    name: "Reality Check",
    color: "#22d3ee",
    ring: "outer",
    role: "Financial truth-teller. No product advice.",
    insight: "The numbers may say yes. But readiness is bigger than math.",
  },
  {
    key: "gut",
    name: "Gut Check",
    color: "#34d399",
    ring: "middle",
    role: "Emotional truth-teller. Not therapy.",
    insight: "Your gut is part of the math here. Pressure is not the same as wanting it.",
  },
  {
    key: "timing",
    name: "Timing Advisor",
    color: "#facc15",
    ring: "inner",
    role: "Life-stage and timing context. No certainty claims.",
    insight: "Most people don't regret what they bought. They regret when they bought it.",
  },
  {
    key: "planner",
    name: "Finance Planner",
    color: "#22d3ee",
    ring: "outer",
    role: "Calculator-backed education. No product recommendations.",
    insight: "Here's where you actually stand — the math, shown honestly, nothing sold.",
  },
  {
    key: "guardrail",
    name: "Guardrail",
    color: "#f24822",
    ring: "center",
    role: "Safety, refusals, auditability. Cannot be bypassed.",
    insight: "Some lines exist to protect you. I hold them even when you push.",
  },
];

export function Voices() {
  const [active, setActive] = useState<Mode>(MODES[0]);

  const glow = {
    outer: active.ring === "outer" ? 1.6 : 0.55,
    middle: active.ring === "middle" ? 1.5 : 0.55,
    inner: active.ring === "inner" ? 1.4 : 0.55,
  };

  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div className="order-2 flex flex-col gap-3 lg:order-1">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MODES.map((mode) => {
            const selected = mode.key === active.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => setActive(mode)}
                aria-pressed={selected}
                className="rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200"
                style={{
                  borderColor: selected ? `${mode.color}66` : "rgba(148,163,184,0.18)",
                  background: selected ? `${mode.color}10` : "rgba(15,23,42,0.5)",
                  color: selected ? mode.color : "#94a3b8",
                }}
              >
                {mode.name}
              </button>
            );
          })}
        </div>

        <div className="glass mt-3 p-6" aria-live="polite">
          <p className="text-xs uppercase tracking-widest text-dim/70">{active.role}</p>
          <p className="mt-3 font-display text-lg leading-relaxed text-light">
            &ldquo;{active.insight}&rdquo;
          </p>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-dim/80">
          Readiness is not one voice. It is the moment your numbers, your gut, and your
          timing finally tell the same truth.
        </p>
      </div>

      <div className="order-1 flex justify-center lg:order-2">
        <div className="compass-float">
          <CinematicCompass
            size={320}
            glow={glow}
            keyholePulse={active.ring === "center"}
          />
        </div>
      </div>
    </div>
  );
}
