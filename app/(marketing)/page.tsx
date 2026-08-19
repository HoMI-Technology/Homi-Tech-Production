import type { Metadata } from "next";
import { InterviewHero } from "@/components/home/InterviewHero";
import { WALK_CLARITY, WALK_COMPANION, WALK_OBJECT, WALK_PRIMARY } from "@/components/home/walk-copy";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/seo/site";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Know When You're Ready — Decision Readiness Intelligence™",
  description:
    "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
  alternates: { canonical: "/" },
};

/**
 * Front door — question, inversion, one Assess, hero-scale Brand
 * compass. Later locked lines are paper-readable. No sticky walk,
 * no scroll-lit theater, no traveling pill.
 */
export default function MarketingHomePage() {
  return (
    <>
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />

      <InterviewHero />

      {/* Paper: one locked line per scroll position — vh-scale gaps so each
          frame is finished, native scroll only. Reveal is the LCP-safe house
          fade (server HTML visible, reduced-motion and no-JS see plain text). */}
      <section className="bg-navy px-5 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-[18vh] sm:gap-[24vh]">
          <Reveal>
            <p className="type-display max-w-4xl text-ink">{WALK_COMPANION}</p>
          </Reveal>
          <Reveal>
            <p className="type-display max-w-4xl text-ink">{WALK_PRIMARY}</p>
          </Reveal>
          <Reveal>
            <p className="type-display max-w-4xl text-ink">{WALK_CLARITY}</p>
          </Reveal>
          <Reveal>
            <p className="type-display max-w-4xl text-ink">
              Not yet is not <span className="text-emerald">no</span>.
            </p>
          </Reveal>
          <Reveal>
            <p className="type-display max-w-4xl text-ink">{WALK_OBJECT}</p>
          </Reveal>
        </div>
      </section>

      <section id="waitlist" className="bg-navy px-5 pb-24 pt-[12vh] sm:px-6 lg:px-8">
        <div className="walk-waitlist-form mx-auto w-full max-w-7xl">
          <div className="w-full max-w-sm">
            <WaitlistForm source="landing" idPrefix="landing-waitlist" surface="whisper" />
          </div>
        </div>
      </section>
    </>
  );
}
