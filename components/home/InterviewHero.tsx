"use client";

import Image from "next/image";
import Link from "next/link";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { PILLARS } from "@/lib/brand";
import { track } from "@/lib/analytics";

export const HERO_VARIANT: "interview" | "film" = "film";

function handleCtaClick(): void {
  track("hero_cta_click", { src: "hero" });
}

/**
 * TeraFab hero — the void, the question, the object.
 *
 * The compass is a sculpture standing in navy, not a background plate:
 * `contain` inside a frame narrower than the 1280×720 raster, so the brass
 * is never upscaled. Type holds the left axis on a navy veil.
 *
 * Locked: question, companion line, inversion, one Assess. Hero stack is
 * four units — kicker, headline, one subtext, CTA — closed by the pillar
 * index. Assess does not travel.
 */
export function InterviewHero() {
  return (
    <section className="tf-hero tf-scene relative flex flex-col justify-end overflow-hidden pb-10 pt-24 sm:pb-14">
      <div className="tf-plate tf-hero-plate" aria-hidden>
        <Image
          src="/marketing/home/object-hero.jpg"
          alt=""
          width={1280}
          height={720}
          priority
          className="tf-media"
        />
      </div>
      <div className="tf-veil" aria-hidden />

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
        <div className="tf-hero-rule mt-8" aria-hidden />
        <p className="mt-8 max-w-[42ch] text-lg font-light leading-snug text-light sm:text-xl">
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

        <div className="tf-rule mt-14 w-full flex-wrap gap-y-2 sm:mt-20">
          {PILLARS.map((pillar) => (
            <span key={pillar.key} className="tf-mark">
              {pillar.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
