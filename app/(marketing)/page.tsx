import type { Metadata } from "next";
import { InterviewHero } from "@/components/home/InterviewHero";
import { WalkBeat } from "@/components/home/WalkBeat";
import { WalkPersist } from "@/components/home/walk-persist";
import {
  WALK_CLARITY,
  WALK_COMPANION,
  WALK_INVERSION,
  WALK_OBJECT,
  WALK_PRIMARY,
} from "@/components/home/walk-copy";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/seo/site";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";

export const metadata: Metadata = {
  title: "Know When You're Ready — Decision Readiness Intelligence™",
  description:
    "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
  alternates: { canonical: "/" },
};

/**
 * Marketing walk — craft bar, HōMI identity.
 *
 * Sticky 100vh scenes, native scroll, rAF-lit later lines, one idea
 * per hold. Locked copy only. One traveling Assess. Navy / Fraunces /
 * Inter. No TeraFab stack, no second walk CTA, no 4-band theater.
 */
export default function MarketingHomePage() {
  return (
    <>
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />

      <WalkPersist>
        <InterviewHero />

        <WalkBeat words={3}>{WALK_COMPANION}</WalkBeat>
        <WalkBeat words={9}>{WALK_INVERSION}</WalkBeat>
        <WalkBeat id="walk-when" words={8}>
          {WALK_PRIMARY}
        </WalkBeat>
        <WalkBeat words={3}>{WALK_CLARITY}</WalkBeat>
        <WalkBeat words={5}>
          Not yet is not <span className="text-emerald">no</span>.
        </WalkBeat>
        <WalkBeat words={15}>{WALK_OBJECT}</WalkBeat>

        <section id="waitlist" className="hero-chapter relative z-[1] px-5 py-24 sm:px-6 lg:px-8">
          <div className="walk-waitlist-form mx-auto w-full max-w-7xl">
            <div className="w-full max-w-sm">
              <WaitlistForm source="landing" idPrefix="landing-waitlist" surface="whisper" />
            </div>
          </div>
        </section>
      </WalkPersist>
    </>
  );
}
