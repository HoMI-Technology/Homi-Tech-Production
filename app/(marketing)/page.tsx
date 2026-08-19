import type { Metadata } from "next";
import { InterviewHero } from "@/components/home/InterviewHero";
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
 * Front door — question, one Assess, quiet Brand compass.
 * Later locked lines are paper-readable. No sticky walk, no
 * scroll-lit theater, no traveling pill.
 */
export default function MarketingHomePage() {
  return (
    <>
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />

      <InterviewHero />

      <section className="bg-navy px-5 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-16">
          <p className="type-display max-w-4xl text-ink">{WALK_COMPANION}</p>
          <p className="type-display max-w-4xl text-ink">{WALK_INVERSION}</p>
          <p className="type-display max-w-4xl text-ink">{WALK_PRIMARY}</p>
          <p className="type-display max-w-4xl text-ink">{WALK_CLARITY}</p>
          <p className="type-display max-w-4xl text-ink">
            Not yet is not <span className="text-emerald">no</span>.
          </p>
          <p className="type-display max-w-4xl text-ink">{WALK_OBJECT}</p>
        </div>
      </section>

      <section id="waitlist" className="bg-navy px-5 pb-24 sm:px-6 lg:px-8">
        <div className="walk-waitlist-form mx-auto w-full max-w-7xl">
          <div className="w-full max-w-sm">
            <WaitlistForm source="landing" idPrefix="landing-waitlist" surface="whisper" />
          </div>
        </div>
      </section>
    </>
  );
}
