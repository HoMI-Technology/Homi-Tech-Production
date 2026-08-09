"use client";

import { useState } from "react";
import { CinematicCompass } from "./CinematicCompass";
import { SegmentedControl, type SegmentedAccent } from "@/components/ui/SegmentedControl";

/**
 * Section 7 — the intelligence modes around the compass. Not chatbots,
 * not mascots: six modes of one honest companion. Selecting a mode
 * brightens the compass layer it listens to and reveals one insight.
 */

interface Mode {
  key: string;
  name: string;
  accent: SegmentedAccent;
  ring: "outer" | "middle" | "inner" | "center";
  role: string;
  insight: string;
}

const MODES: Mode[] = [
  {
    key: "homie",
    name: "Homie",
    accent: "light",
    ring: "center",
    role: "Warm companion. No conversion pressure.",
    insight: "I'm not here to move you forward. I'm here to make sure you'll be okay.",
  },
  {
    key: "reality",
    name: "Reality Check",
    accent: "cyan",
    ring: "outer",
    role: "Financial truth-teller. No product advice.",
    insight: "The numbers may say yes. But readiness is bigger than math.",
  },
  {
    key: "gut",
    name: "Gut Check",
    accent: "emerald",
    ring: "middle",
    role: "Emotional truth-teller. Not therapy.",
    insight: "Your gut is part of the math here. Pressure is not the same as wanting it.",
  },
  {
    key: "timing",
    name: "Timing Advisor",
    accent: "yellow",
    ring: "inner",
    role: "Life-stage and timing context. No certainty claims.",
    insight: "Most people don't regret what they bought. They regret when they bought it.",
  },
  {
    key: "planner",
    name: "Finance Planner",
    accent: "cyan",
    ring: "outer",
    role: "Calculator-backed education. No product recommendations.",
    insight: "Here's where you actually stand — the math, shown honestly, nothing sold.",
  },
  {
    key: "guardrail",
    name: "Guardrail",
    accent: "crimson",
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
        <SegmentedControl
          ariaLabel="Companion modes"
          options={MODES.map((m) => ({ value: m.key, label: m.name, accent: m.accent }))}
          value={active.key}
          onChange={(key) => {
            const mode = MODES.find((m) => m.key === key);
            if (mode) setActive(mode);
          }}
          variant="card"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        />

        <div className="glass mt-3 p-6" aria-live="polite">
          <p className="text-xs uppercase tracking-widest text-dim/70">{active.role}</p>
          <p className="mt-3 font-display text-lg leading-relaxed text-light">
            &ldquo;{active.insight}&rdquo;
          </p>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-dim/80">
          Readiness is not one voice. It is the moment your numbers, your gut, and your timing
          finally tell the same truth.
        </p>
      </div>

      <div className="order-1 flex justify-center lg:order-2">
        <div className="compass-float">
          <CinematicCompass size={320} glow={glow} keyholePulse={active.ring === "center"} />
        </div>
      </div>
    </div>
  );
}
