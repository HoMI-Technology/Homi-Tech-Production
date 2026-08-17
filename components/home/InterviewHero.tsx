"use client";

import Image from "next/image";
import Link from "next/link";
import {
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL,
} from "@/components/marketing/first-moment-copy";
import { track } from "@/lib/analytics";

export const HERO_VARIANT: "interview" | "film" = "film";

function handleCtaClick(): void {
  track("hero_cta_click", { src: "hero" });
}

/**
 * TeraFab hero: one still is the scene. Type sits on the left void.
 * Locked question + companion + inversion. Assess does not travel.
 * Hero stack is four units: kicker, headline, one subtext, CTA.
 */
export function InterviewHero() {
  return (
    <section className="tf-hero relative flex flex-col justify-end overflow-hidden pb-10 pt-24 sm:pb-16">
      <Image
        src="/marketing/home/object-hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="tf-media"
      />
      <div className="tf-hero-scrim" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start px-5 sm:px-6 lg:px-8">
        <div className="relative pt-8">
          <a href="#statement" className="walk-kicker">
            What this is
          </a>
          <h1
            className="type-giant w-full max-w-[16ch] whitespace-normal font-display font-semibold"
            style={{ textWrap: "balance" }}
          >
            Will you be okay?
          </h1>
        </div>
        <p className="mt-6 max-w-[42ch] text-lg font-light leading-snug text-light sm:text-xl">
          A Decision Companion.{" "}
          <span className="text-dim">Everyone else tells you how. HōMI tells you if.</span>
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
