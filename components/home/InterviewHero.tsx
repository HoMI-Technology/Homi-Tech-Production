"use client";

import Link from "next/link";
import { type CSSProperties } from "react";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { CinematicCompass } from "./CinematicCompass";
import { WALK_QUESTION } from "./walk-copy";
import { track } from "@/lib/analytics";

/** Quiet lower-right field — off the H1 and off the Assess pill. */
const COMPASS_FIELD: CSSProperties = {
  position: "absolute",
  top: "auto",
  left: "auto",
  right: "max(1.25rem, 5vw)",
  bottom: "max(6.75rem, 12vh)",
  width: "min(26vmin, 9.25rem)",
  height: "auto",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "flex-end",
};

function handleCtaClick(): void {
  track("hero_cta_click", { src: "hero" });
}

/**
 * Front door — first viewport, finished on load.
 * Question paints at opacity 1. One Assess sits under the H1, never
 * on “be”, and does not travel. Brand compass stays in the field.
 */
export function InterviewHero() {
  return (
    <section className="relative isolate min-h-[calc(100dvh-var(--nav-offset))] bg-navy px-5 sm:px-6 lg:px-8">
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-var(--nav-offset))] w-full max-w-7xl flex-col items-start justify-center pb-28">
        <h1
          className="type-giant max-w-[14ch] text-ink"
          style={{ textWrap: "balance", opacity: 1 }}
        >
          {WALK_QUESTION}
        </h1>
        <Link
          href={`${PRIMARY_CLOSE_HREF}?src=hero`}
          className="btn btn-primary btn-sm mt-8"
          onClick={handleCtaClick}
        >
          {PRIMARY_CLOSE_LABEL}
        </Link>
      </div>

      <div
        className="pointer-events-none"
        data-walk-compass=""
        data-walk-object=""
        aria-hidden
        style={COMPASS_FIELD}
      >
        <div style={{ width: "100%" }}>
          <CinematicCompass responsive keyholePulse={false} />
        </div>
      </div>
    </section>
  );
}
