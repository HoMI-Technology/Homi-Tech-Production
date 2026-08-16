"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CinematicCompass } from "./CinematicCompass";
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
 * TeraFab craft: one still scene, giant type, one instrument.
 * Locked question + companion + inversion. Compass does not travel.
 */
export function InterviewHero() {
  useFieldLight();

  return (
    <section className="hero-deep hero-story relative flex min-h-[100dvh] flex-col justify-end overflow-hidden pb-16 pt-28 sm:justify-center sm:pb-0">
      <HeroAtmosphere />

      <div className="hero-still-compass" data-at="field" aria-hidden>
        <div className="hero-still-compass-body">
          <div className="walk-compass-halo" />
          <CinematicCompass responsive keyholePulse={false} />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start px-5 sm:px-6 lg:px-8">
        <a href="#statement" className="walk-kicker">
          What this is
        </a>
        <h1
          className="type-giant mt-5 w-full max-w-3xl whitespace-normal font-display font-semibold"
          style={{
            textWrap: "balance",
            textShadow: `0 2px 32px ${withAlpha(COLORS.navy, 0.88)}`,
          }}
        >
          Will you be okay?
        </h1>
        <p className="mt-6 max-w-xl text-2xl font-light text-light sm:text-3xl">
          A Decision Companion.
        </p>
        <p className="mt-3 max-w-xl text-lg text-dim sm:text-xl">
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

/** Field brightens as you travel — TeraFab sun, on-token navy. */
function useFieldLight(): void {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.style.setProperty("--tf-light", "1");
      return;
    }

    let raf = 0;
    const paint = () => {
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      const t = Math.max(0, Math.min(1, window.scrollY / max));
      root.style.setProperty("--tf-light", t.toFixed(3));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    paint();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
}

function HeroAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: [
            `radial-gradient(ellipse 70% 60% at 78% 42%, ${withAlpha(COLORS.cyan, 0.16)}, transparent 62%)`,
            `radial-gradient(ellipse 40% 36% at 72% 58%, ${withAlpha(COLORS.emerald, 0.1)}, transparent 70%)`,
          ].join(", "),
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: [
            `linear-gradient(90deg, ${withAlpha(COLORS.navy, 0.88)} 0%, ${withAlpha(COLORS.navy, 0.42)} 42%, transparent 72%)`,
            `linear-gradient(180deg, ${withAlpha(COLORS.navy, 0.35)} 0%, transparent 28%, ${withAlpha(COLORS.navy, 0.82)} 100%)`,
          ].join(", "),
        }}
      />
    </div>
  );
}
