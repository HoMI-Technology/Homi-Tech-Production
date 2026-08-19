"use client";

import Link from "next/link";
import {
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL_HOME,
} from "@/components/marketing/first-moment-copy";
import { Compass3D } from "./Compass3D";
import { BRAND } from "@/lib/brand";
import { WALK_INVERSION, WALK_QUESTION } from "./walk-copy";
import { track } from "@/lib/analytics";

function handleCtaClick(): void {
  track("hero_cta_click", { src: "hero" });
}

/**
 * Front door — first viewport, finished on load.
 * Question paints at opacity 1. Inversion is on this screen.
 * One Assess sits under the type. Brand compass owns the right
 * field at hero scale — glow, depth, material — and never unmounts.
 */
export function InterviewHero() {
  return (
    <section className="hero-field relative isolate min-h-[calc(100dvh-var(--nav-offset))] overflow-hidden bg-navy px-5 sm:px-6 lg:px-8">
      <div
        className="pointer-events-none absolute z-0 flex aspect-square w-[min(56vmin,18rem)] items-center justify-center bottom-[max(1.5rem,4vh)] left-1/2 -translate-x-1/2 md:bottom-auto md:left-auto md:right-[max(-1.5rem,-2vw)] md:top-1/2 md:w-[min(68vmin,38rem)] md:-translate-y-1/2 md:translate-x-0"
        data-walk-compass=""
        data-walk-object=""
        data-hero-compass=""
        aria-hidden
      >
        <Compass3D size={0} className="h-full w-full" keyholePulse={false} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-var(--nav-offset))] w-full max-w-7xl flex-col items-start justify-center pb-[min(20rem,42vh)] md:pb-16">
        <p className="eyebrow">{BRAND.category}</p>
        <h1
          className="type-giant mt-5 max-w-[14ch] text-ink"
          style={{ textWrap: "balance", opacity: 1 }}
        >
          {WALK_QUESTION}
        </h1>
        <p
          className="type-h2 mt-8 max-w-[22ch] text-ink"
          style={{ textWrap: "balance", opacity: 1 }}
        >
          {WALK_INVERSION}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={`${PRIMARY_CLOSE_HREF}?src=hero`}
            className="btn btn-primary"
            onClick={handleCtaClick}
          >
            {PRIMARY_CLOSE_LABEL_HOME}
          </Link>
          <Link href="/how-it-works" className="btn btn-ghost">
            How it works
          </Link>
        </div>
        <p className="mt-4 text-sm text-dim">
          Free &middot; about 5 minutes &middot; educational only
        </p>
      </div>
    </section>
  );
}
