"use client";

import { useState } from "react";
import { CinematicCompass } from "./CinematicCompass";

/**
 * Section 4 — the compass, made understandable. Hovering (or focusing)
 * a card brightens its ring; the instrument answers the reader.
 */

const CARDS = [
  {
    key: "outer" as const,
    name: "Financial Reality",
    color: "#22d3ee",
    ring: "Outer ring",
    ask: "Can you absorb this decision without destabilizing your foundation?",
  },
  {
    key: "middle" as const,
    name: "Emotional Truth",
    color: "#34d399",
    ring: "Middle ring",
    ask: "Are you choosing from clarity, or from pressure?",
  },
  {
    key: "inner" as const,
    name: "Perfect Timing",
    color: "#facc15",
    ring: "Inner ring",
    ask: "Does this moment support the decision?",
  },
];

export function CompassExplainer() {
  const [active, setActive] = useState<"outer" | "middle" | "inner" | null>(null);

  const glow = {
    outer: active === null ? 1 : active === "outer" ? 1.6 : 0.45,
    middle: active === null ? 1 : active === "middle" ? 1.5 : 0.45,
    inner: active === null ? 1 : active === "inner" ? 1.4 : 0.45,
  };

  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div className="flex justify-center">
        <div className="compass-float">
          <CinematicCompass size={360} glow={glow} keyholePulse={false} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            className="glass glass-hover tilt cursor-default p-6 text-left"
            onMouseEnter={() => setActive(card.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(card.key)}
            onBlur={() => setActive(null)}
            style={active === card.key ? { borderColor: `${card.color}66` } : undefined}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-light">
                <span
                  className="mr-2.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                  style={{ background: card.color, boxShadow: `0 0 10px ${card.color}88` }}
                />
                {card.name}
              </h3>
              <span className="text-xs uppercase tracking-widest text-dim/70">{card.ring}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-dim">{card.ask}</p>
          </button>
        ))}
        <p className="mt-2 text-sm leading-relaxed text-dim/80">
          When all three align — truly align — your compass becomes a key. That&rsquo;s when
          you&rsquo;re ready.
        </p>
      </div>
    </div>
  );
}
