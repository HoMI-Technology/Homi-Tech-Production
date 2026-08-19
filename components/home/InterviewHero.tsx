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
 * TeraFab hero, HōMI words.
 *
 * Restrained per the reference: the title caps at 4.4rem in the display
 * face at weight 300, not at cinema scale. Kicker is a 13px sans line in
 * secondary ink. The object is a flush hard-edged panel on the grid, not
 * a full-bleed wash. A hairline foot carries the three pillars.
 *
 * Locked: question, companion line, inversion, one Assess. Assess does
 * not travel.
 */
export function InterviewHero() {
  return (
    <section className="tf-hero tf-scene relative flex flex-col pt-24">
      <div className="tf-shell relative flex-1">
        <div className="tf-hero-copy">
          <a href="#statement" className="tf-kicker">
            What this is
          </a>
          <h1 className="type-giant mt-7 max-w-[14ch] font-light" style={{ textWrap: "balance" }}>
            Will you be okay?
          </h1>
          <p className="tf-lede mt-7 max-w-[38ch] font-light">
            A Decision Companion.{" "}
            <span className="text-dim">Everyone else tells you how. HōMI tells you if.</span>
          </p>
          <Link
            href={`${PRIMARY_CLOSE_HREF}?src=hero`}
            className="btn btn-primary mt-9 px-8 py-3.5 text-base"
            onClick={handleCtaClick}
          >
            {PRIMARY_CLOSE_LABEL}
          </Link>
        </div>

        <div className="tf-panel tf-hero-panel">
          <Image
            src="/marketing/home/object-hero.jpg"
            alt=""
            width={1280}
            height={720}
            priority
            sizes="(min-width: 64rem) 46vw, 90vw"
          />
        </div>

        <div className="tf-hero-foot">
          {PILLARS.map((pillar) => (
            <span key={pillar.key} className="tf-code">
              {pillar.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
