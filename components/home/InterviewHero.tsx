"use client";

import Link from "next/link";
import { CinematicCompass, Particles } from "./CinematicCompass";
import {
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL,
} from "@/components/marketing/first-moment-copy";
import { track } from "@/lib/analytics";
import { COLORS, withAlpha } from "@/lib/brand";

export const HERO_VARIANT: "interview" | "film" = "film";

function handleCtaClick(): void {
  track("hero_cta_click", { src: "hero" });
}

/**
 * First viewport of the hybrid front door.
 * Locked question + companion + inversion on one still screen.
 * Assess is a normal button. Compass does not travel.
 */
export function InterviewHero() {
  return (
    <section className="hero-deep hero-story relative flex min-h-[100dvh] flex-col justify-center overflow-hidden">
      <HeroAtmosphere />

      <div
        className="hero-still-compass"
        data-at="field"
        aria-hidden
      >
        <div className="hero-still-compass-body">
          <div className="walk-compass-halo" />
          <CinematicCompass responsive keyholePulse={false} />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start px-5 pb-28 sm:px-6 lg:px-8 lg:pb-0">
        <a href="#statement" className="walk-kicker">
          What this is
        </a>
        <h1
          className="type-giant mt-4 w-full max-w-xl whitespace-normal font-display font-semibold lg:max-w-[32rem]"
          style={{
            textWrap: "balance",
            textShadow: `0 2px 32px ${withAlpha(COLORS.navy, 0.88)}`,
          }}
        >
          Will you be okay?
        </h1>
        <p className="mt-6 max-w-xl font-display text-xl text-light sm:text-2xl">
          A Decision Companion.
        </p>
        <p className="mt-3 max-w-xl text-lg text-dim">
          Everyone else tells you how. HōMI tells you if.
        </p>
        <Link
          href={`${PRIMARY_CLOSE_HREF}?src=hero`}
          className="btn btn-primary mt-10 px-8 py-3.5 text-base"
          onClick={handleCtaClick}
        >
          {PRIMARY_CLOSE_LABEL}
        </Link>
      </div>
    </section>
  );
}

function HeroAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: [
            `radial-gradient(ellipse 58% 52% at 68% 42%, ${withAlpha(COLORS.cyan, 0.22)}, transparent 64%)`,
            `radial-gradient(ellipse 42% 40% at 74% 54%, ${withAlpha(COLORS.emerald, 0.16)}, transparent 62%)`,
            `radial-gradient(ellipse 30% 26% at 64% 36%, ${withAlpha(COLORS.yellow, 0.1)}, transparent 70%)`,
          ].join(", "),
        }}
      />
      <div
        className="absolute inset-[-36px]"
        style={{
          backgroundImage: [
            `linear-gradient(${withAlpha(COLORS.cyan, 0.09)} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${withAlpha(COLORS.cyan, 0.09)} 1px, transparent 1px)`,
          ].join(", "),
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 82% 72% at 58% 40%, black 16%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 82% 72% at 58% 40%, black 16%, transparent 78%)",
        }}
      />
      <Particles />
      <div
        className="absolute inset-0"
        style={{
          background: [
            `linear-gradient(90deg, ${withAlpha(COLORS.navy, 0.82)} 0%, ${withAlpha(COLORS.navy, 0.58)} 28%, ${withAlpha(COLORS.navy, 0.18)} 52%, ${withAlpha(COLORS.navy, 0)} 72%)`,
            `linear-gradient(180deg, ${withAlpha(COLORS.navy, 0)} 58%, ${withAlpha(COLORS.navy, 0.72)} 100%)`,
          ].join(", "),
        }}
      />
    </div>
  );
}
