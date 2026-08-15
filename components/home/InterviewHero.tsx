"use client";

import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Particles } from "./CinematicCompass";
import { HoldStage, WalkWords } from "./walk-hold";
import { tokenizeWalkLine } from "./walk-tokens";
import { COLORS, withAlpha } from "@/lib/brand";

export { WalkPersist } from "./walk-persist";

/**
 * InterviewHero — opening walk (TeraFab rhythm: one idea per scroll).
 *
 * 1. First viewport — the question. Living instrument. Assess on first paint.
 * 2. Next scroll — the noun.
 * 3. Next — the inversion.
 *
 * Type sits ON the navy field. Compass and Assess travel via WalkPersist —
 * one instance each, never destroyed on the hero and reborn at the close.
 * DESIGN.md: navy/cyan, type-display, PRM-safe (no spin/beam/tilt).
 *
 * SEO/AT: h1 text is in the DOM from first paint. Visual resolve is
 * invisible→full on scroll; prefers-reduced-motion paints the final line.
 */

export const HERO_VARIANT: "interview" | "film" = "film";

export function InterviewHero() {
  return (
    <>
      <OpeningBeat />
      <IdeaBeat>A Decision Companion.</IdeaBeat>
      <IdeaBeat>Everyone else tells you how. HōMI tells you if.</IdeaBeat>
    </>
  );
}

const CHAPTER_STAGE =
  "hero-deep hero-chapter relative flex min-h-[100dvh] flex-col justify-center overflow-hidden";

/** Shared type column — one left axis, one optical line band. */
export function WalkCluster({
  kicker,
  children,
  after,
}: {
  kicker?: ReactNode;
  children: ReactNode;
  after?: ReactNode;
}) {
  return (
    <div className="walk-cluster relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start px-5 sm:px-6 lg:px-8">
      <div className="walk-line">
        {kicker}
        {children}
      </div>
      {after}
    </div>
  );
}

/** Full-viewport chapter field. Homepage walk reuses this — no new marketing sections. */
export function WalkChapter({
  id,
  children,
  hold = false,
  words = 0,
  object = false,
}: {
  id?: string;
  children: ReactNode;
  /** Pin the stage until the line finishes resolving. Close / waitlist stay unpinned. */
  hold?: boolean;
  words?: number;
  object?: boolean;
}) {
  const body = (
    <>
      <ChapterField />
      <div className="walk-cluster relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start px-5 sm:px-6 lg:px-8">
        {children}
      </div>
    </>
  );

  if (hold) {
    return (
      <HoldStage id={id} words={words} object={object} className={CHAPTER_STAGE}>
        {body}
      </HoldStage>
    );
  }

  return (
    <section
      id={id}
      className={`${CHAPTER_STAGE} scroll-mt-24`}
    >
      {body}
    </section>
  );
}

export function IdeaBeat({
  id,
  children,
  after,
  before,
  headingClassName,
  object = false,
}: {
  id?: string;
  children: ReactNode;
  after?: ReactNode;
  before?: ReactNode;
  headingClassName?: string;
  object?: boolean;
}) {
  const tokens = useMemo(() => tokenizeWalkLine(children), [children]);
  return (
    <WalkChapter id={id} hold words={tokens.length} object={object}>
      {before}
      <div className="walk-line">
        <h2
          className={
            headingClassName ??
            "type-display max-w-2xl font-display font-semibold"
          }
          style={{ textWrap: "balance" }}
        >
          <WalkWords tokens={tokens} />
        </h2>
      </div>
      {after}
    </WalkChapter>
  );
}

function OpeningBeat() {
  const fieldRef = useRef<HTMLDivElement>(null);
  useHeroField(fieldRef);
  const question = "Will you be okay?";
  const words = tokenizeWalkLine(question).length;

  return (
    <HoldStage
      words={words}
      stageRef={fieldRef}
      cinema="hero"
      className="hero-deep hero-story relative flex min-h-[100dvh] flex-col justify-center overflow-hidden"
    >
      <HeroAtmosphere />

      <WalkCluster
        kicker={
          <a href="#statement" className="walk-kicker">
            What this is
          </a>
        }
      >
        <h1
          className="type-giant w-full max-w-xl whitespace-normal font-display font-semibold lg:max-w-[32rem]"
          style={{
            textWrap: "balance",
            textShadow: `0 2px 32px ${withAlpha(COLORS.navy, 0.88)}`,
          }}
        >
          <WalkWords>Will you be okay?</WalkWords>
        </h1>
      </WalkCluster>
    </HoldStage>
  );
}

/** Pointer + scroll light the room. Touch: no fake pointer. PRM: still. */
function useHeroField(ref: RefObject<HTMLDivElement | null>) {
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

