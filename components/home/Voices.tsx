"use client";

import { useState } from "react";
import { CinematicCompass } from "./CinematicCompass";
import { SegmentedControl, accentFromBrandHex } from "@/components/ui/SegmentedControl";
import { LAUNCH_SKINS, type LaunchSkinKey } from "@/lib/advisor/identity";

/**
 * Marketing companion layer — three launch skins on the surface.
 * Founder lock: Steady / Clarity / Horizon only. Homie / Reality
 * / Gut / Timing and advocate/skeptic/arbiter stay off default chrome.
 */

interface SkinMode {
  key: LaunchSkinKey;
  name: string;
  color: string;
  ring: "outer" | "middle" | "inner";
  role: string;
  insight: string;
}

const INSIGHTS: Record<LaunchSkinKey, { ring: SkinMode["ring"]; insight: string }> = {
  steady: {
    ring: "middle",
    insight: "Your gut is part of the math here. Pressure is not the same as wanting it.",
  },
  clarity: {
    ring: "outer",
    insight: "The numbers may say yes. But readiness is bigger than math.",
  },
  horizon: {
    ring: "inner",
    insight: "Most people don't regret what they bought. They regret when they bought it.",
  },
};

const SKINS: SkinMode[] = LAUNCH_SKINS.map((skin) => {
  const key = skin.key;
  return {
    key,
    name: skin.name,
    color: skin.color,
    role: skin.role,
    ring: INSIGHTS[key].ring,
    insight: INSIGHTS[key].insight,
  };
});

export function Voices() {
  const [active, setActive] = useState<SkinMode>(SKINS[0]);

  const glow = {
    outer: active.ring === "outer" ? 1.6 : 0.55,
    middle: active.ring === "middle" ? 1.5 : 0.55,
    inner: active.ring === "inner" ? 1.4 : 0.55,
  };

  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div className="order-2 flex flex-col gap-3 lg:order-1">
        <SegmentedControl
          ariaLabel="Companion skins"
          options={SKINS.map((m) => ({
            value: m.key,
            label: m.name,
            accent: accentFromBrandHex(m.color),
          }))}
          value={active.key}
          onChange={(key) => {
            const mode = SKINS.find((m) => m.key === key);
            if (mode) setActive(mode);
          }}
          variant="card"
          className="grid grid-cols-3 gap-3"
        />

        <div className="glass mt-3 p-6" aria-live="polite">
          <p className="text-xs uppercase tracking-widest text-dim/70">{active.role}</p>
          <p className="mt-3 font-display text-lg leading-relaxed text-light">
            &ldquo;{active.insight}&rdquo;
          </p>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-dim/80">
          Three honest reads, one companion. Choose how to hear it: Steady, Clarity, or Horizon.
        </p>
      </div>

      <div className="order-1 flex justify-center lg:order-2">
        <div className="compass-float">
          <CinematicCompass size={320} glow={glow} keyholePulse={false} />
        </div>
      </div>
    </div>
  );
}
