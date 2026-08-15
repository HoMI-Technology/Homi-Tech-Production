"use client";

import Link from "next/link";
import {
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL,
} from "@/components/marketing/first-moment-copy";
import { Particles } from "./CinematicCompass";
import { Compass3D } from "./Compass3D";
import { track } from "@/lib/analytics";
import { COLORS, withAlpha } from "@/lib/brand";

/**
 * InterviewHero — first-viewport cinematic open (TeraFab overlay).
 * Type sits ON the navy field. Compass is atmosphere, not a second column.
 * Assess is visible immediately — not gated behind interview chips.
 * DESIGN.md: navy/cyan, type-display, PRM-safe (no spin/beam in this surface).
 *
 * SEO/AT: h1 is in the DOM from first paint at full contrast.
 */

export const HERO_VARIANT: "interview" | "film" = "film";

function handleCtaClick() {
  track("hero_cta_click", { src: "hero" });
}

export function InterviewHero() {
  return (
    <section
      data-cinema="hero"
      className="hero-deep relative flex min-h-[100dvh] flex-col justify-center overflow-hidden"
    >
      <HeroAtmosphere />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-center px-5 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8">
        <div className="max-w-xl">
          <h1 className="type-display" style={{ textWrap: "balance" }}>
            Will you be okay?
          </h1>

          <p className="mt-3 font-display text-xl leading-snug text-light sm:text-2xl">
            A Decision Companion.
          </p>

          <p className="mt-4 max-w-[36ch] text-base leading-relaxed text-light sm:text-lg">
            Everyone else tells you how. HōMI tells you if.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link
              href={`${PRIMARY_CLOSE_HREF}?src=hero`}
              className="btn btn-primary btn-glow px-8 py-3.5 text-base"
              onClick={handleCtaClick}
            >
              {PRIMARY_CLOSE_LABEL}
            </Link>
            <a href="#statement" className="btn btn-ghost px-8 py-3.5 text-base">
              What this is
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Full-bleed field: 72px cyan grid, glows, quiet compass, dual scrim. */
function HeroAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: [
            `radial-gradient(ellipse 55% 50% at 68% 42%, ${withAlpha(COLORS.cyan, 0.16)}, transparent 62%)`,
            `radial-gradient(ellipse 40% 38% at 74% 58%, ${withAlpha(COLORS.emerald, 0.12)}, transparent 60%)`,
            `radial-gradient(ellipse 28% 24% at 64% 40%, ${withAlpha(COLORS.yellow, 0.08)}, transparent 70%)`,
          ].join(", "),
        }}
      />

      <div
        className="absolute inset-[-36px]"
        style={{
          backgroundImage: [
            `linear-gradient(${withAlpha(COLORS.cyan, 0.07)} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${withAlpha(COLORS.cyan, 0.07)} 1px, transparent 1px)`,
          ].join(", "),
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 58% 40%, black 18%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 58% 40%, black 18%, transparent 78%)",
        }}
      />

      <div className="absolute right-[-32%] top-[16%] h-[70%] w-[88%] opacity-[0.22] sm:right-[-8%] sm:top-[6%] sm:h-[86%] sm:w-[68%] sm:opacity-40 lg:right-[-2%] lg:top-[4%] lg:w-[60%] lg:opacity-45">
        <div className="relative mx-auto aspect-square h-full max-h-[720px] w-full max-w-[720px]">
          <RadarRings />
          <div className="absolute left-1/2 top-1/2 w-[58%] -translate-x-1/2 -translate-y-1/2">
            <div className="relative aspect-square w-full">
              <Compass3D
                size={0}
                className="h-full w-full"
                glow={{ outer: 0.55, middle: 0.5, inner: 0.45 }}
                keyholePulse={false}
                maxTilt={5}
              />
            </div>
          </div>
        </div>
      </div>

      <Particles />

      <div
        className="absolute inset-0"
        style={{
          background: [
            `linear-gradient(90deg, ${withAlpha(COLORS.navy, 0.94)} 0%, ${withAlpha(COLORS.navy, 0.72)} 34%, ${withAlpha(COLORS.navy, 0.18)} 58%, ${withAlpha(COLORS.navy, 0)} 72%)`,
            `linear-gradient(180deg, ${withAlpha(COLORS.navy, 0)} 52%, ${withAlpha(COLORS.navy, 0.82)} 100%)`,
          ].join(", "),
        }}
      />
    </div>
  );
}

function RadarRings() {
  return (
    <div className="absolute inset-0">
      <Ring size="94%" color={withAlpha(COLORS.cyan, 0.38)} />
      <Ring size="70%" color={withAlpha(COLORS.emerald, 0.34)} />
      <Ring size="44%" color={withAlpha(COLORS.yellow, 0.4)} />
      <span
        className="absolute left-[calc(50%+22%)] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
        style={{
          background: COLORS.yellow,
          boxShadow: `0 0 10px ${COLORS.yellow}`,
        }}
      />
    </div>
  );
}

function Ring({ size, color }: { size: string; color: string }) {
  return (
    <span
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
      style={{ width: size, height: size, borderColor: color }}
    />
  );
}
