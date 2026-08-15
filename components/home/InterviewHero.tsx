"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { Particles } from "./CinematicCompass";
import { Compass3D } from "./Compass3D";
import { track } from "@/lib/analytics";
import { COLORS, withAlpha } from "@/lib/brand";

/**
 * InterviewHero — opening walk (TeraFab rhythm: one idea per scroll).
 *
 * 1. First viewport — the question. Living instrument. Assess on first paint.
 * 2. Next scroll — the noun.
 * 3. Next — the inversion.
 *
 * Type sits ON the navy field. Compass is atmosphere and presence.
 * Assess is never gated behind a scroll beat or interview chips.
 * DESIGN.md: navy/cyan, type-display, PRM-safe (no spin/beam/tilt).
 *
 * SEO/AT: h1 is in the DOM from first paint at full contrast.
 */

export const HERO_VARIANT: "interview" | "film" = "film";

function handleCtaClick() {
  track("hero_cta_click", { src: "hero" });
}

export function InterviewHero() {
  return (
    <>
      <OpeningBeat />
      <IdeaBeat>A Decision Companion.</IdeaBeat>
      <IdeaBeat>Everyone else tells you how. HōMI tells you if.</IdeaBeat>
    </>
  );
}

function OpeningBeat() {
  const fieldRef = useRef<HTMLElement>(null);
  useHeroField(fieldRef);

  return (
    <section
      ref={fieldRef}
      data-cinema="hero"
      className="hero-deep hero-story relative flex min-h-[100dvh] flex-col justify-center overflow-hidden"
    >
      <HeroAtmosphere />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-center px-5 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8">
        <div className="max-w-xl">
          <h1
            className="type-display"
            style={{
              textWrap: "balance",
              textShadow: `0 2px 32px ${withAlpha(COLORS.navy, 0.88)}`,
            }}
          >
            Will you be okay?
          </h1>

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

function IdeaBeat({ children }: { children: ReactNode }) {
  return (
    <section className="hero-deep hero-chapter relative flex min-h-[100dvh] flex-col justify-center overflow-hidden px-5 sm:px-6 lg:px-8">
      <ChapterField />
      <h2
        className="type-statement relative z-10 mx-auto max-w-5xl font-display font-semibold text-light"
        style={{ textWrap: "balance" }}
      >
        {children}
      </h2>
    </section>
  );
}

/** Pointer + scroll light the room. Touch: no fake pointer. PRM: still. */
function useHeroField(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let raf = 0;

    const setScroll = () => {
      const r = el.getBoundingClientRect();
      const s = Math.max(-1, Math.min(1, -r.top / Math.max(1, window.innerHeight)));
      el.style.setProperty("--hero-s", s.toFixed(3));
    };

    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--hero-x", (e.clientX / window.innerWidth).toFixed(4));
        el.style.setProperty("--hero-y", (e.clientY / window.innerHeight).toFixed(4));
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(setScroll);
    };

    if (!coarse) {
      window.addEventListener("pointermove", onMove, { passive: true });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    setScroll();

    return () => {
      if (!coarse) window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}

/** Full-bleed field: grid, glows, and a gyroscope you can reach into. */
function HeroAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: [
            `radial-gradient(ellipse 58% 52% at calc(var(--hero-x, 0.68) * 100%) calc(var(--hero-y, 0.42) * 100% + var(--hero-s, 0) * 6%), ${withAlpha(COLORS.cyan, 0.22)}, transparent 64%)`,
            `radial-gradient(ellipse 42% 40% at calc(var(--hero-x, 0.68) * 100% + 6%) calc(var(--hero-y, 0.42) * 100% + 12%), ${withAlpha(COLORS.emerald, 0.16)}, transparent 62%)`,
            `radial-gradient(ellipse 30% 26% at calc(var(--hero-x, 0.68) * 100% - 4%) calc(var(--hero-y, 0.42) * 100% - 6%), ${withAlpha(COLORS.yellow, 0.1)}, transparent 70%)`,
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
          backgroundPosition:
            "calc(var(--hero-x, 0.68) * -24px) calc(var(--hero-y, 0.42) * -24px + var(--hero-s, 0) * 16px)",
          maskImage:
            "radial-gradient(ellipse 82% 72% at calc(var(--hero-x, 0.58) * 100%) calc(var(--hero-y, 0.4) * 100%), black 16%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 82% 72% at calc(var(--hero-x, 0.58) * 100%) calc(var(--hero-y, 0.4) * 100%), black 16%, transparent 78%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(38rem circle at calc(var(--hero-x, 0.68) * 100%) calc(var(--hero-y, 0.42) * 100%), ${withAlpha(COLORS.cyan, 0.1)}, transparent 62%)`,
        }}
      />

      <div className="hero-instrument absolute inset-[-6%] sm:inset-[-2%]">
        <div className="hero-rings-enter relative mx-auto aspect-square h-full max-h-[92vmin] w-full max-w-[92vmin]">
          <RadarRings />
          <div className="absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2">
            <div className="relative aspect-square w-full">
              <Compass3D
                size={0}
                className="h-full w-full"
                glow={{ outer: 0.95, middle: 0.88, inner: 0.8 }}
                keyholePulse={false}
                maxTilt={14}
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
            `linear-gradient(90deg, ${withAlpha(COLORS.navy, 0.62)} 0%, ${withAlpha(COLORS.navy, 0.28)} 32%, ${withAlpha(COLORS.navy, 0.06)} 56%, ${withAlpha(COLORS.navy, 0)} 72%)`,
            `linear-gradient(180deg, ${withAlpha(COLORS.navy, 0)} 58%, ${withAlpha(COLORS.navy, 0.72)} 100%)`,
          ].join(", "),
        }}
      />
    </div>
  );
}

function ChapterField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: [
            `radial-gradient(ellipse 50% 44% at 48% 46%, ${withAlpha(COLORS.cyan, 0.1)}, transparent 68%)`,
            `radial-gradient(ellipse 28% 24% at 62% 40%, ${withAlpha(COLORS.emerald, 0.07)}, transparent 70%)`,
          ].join(", "),
        }}
      />
      <div
        className="absolute inset-[-24px]"
        style={{
          backgroundImage: [
            `linear-gradient(${withAlpha(COLORS.cyan, 0.05)} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${withAlpha(COLORS.cyan, 0.05)} 1px, transparent 1px)`,
          ].join(", "),
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 48%, black 12%, transparent 76%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 48%, black 12%, transparent 76%)",
        }}
      />
    </div>
  );
}

function RadarRings() {
  return (
    <div className="absolute inset-0">
      <Ring size="94%" color={withAlpha(COLORS.cyan, 0.42)} />
      <Ring size="70%" color={withAlpha(COLORS.emerald, 0.38)} />
      <Ring size="44%" color={withAlpha(COLORS.yellow, 0.44)} />
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
