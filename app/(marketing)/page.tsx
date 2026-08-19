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

      <div aria-hidden className="bg-navy px-5 sm:px-6 lg:px-8">
        <div className="hairline mx-auto w-full max-w-7xl" />
      </div>

      {/* Paper: one locked line per scroll position. Each line owns a 55svh
          frame (measured: vh-scale gaps still put 2-3 lines in a 900px
          viewport; fixed frames make the rhythm deterministic). Native scroll
          only. Reveal is the LCP-safe house fade — server HTML paints visible,
          reduced-motion and no-JS read plain text. */}
      <section className="bg-navy px-5 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col">
          <Reveal className="flex min-h-[55svh] items-center">
            <p className="type-display max-w-4xl text-light">{WALK_COMPANION}</p>
          </Reveal>
          <Reveal className="flex min-h-[55svh] items-center">
            <p className="type-display max-w-4xl text-light">{WALK_PRIMARY}</p>
          </Reveal>
          <Reveal className="flex min-h-[55svh] items-center">
            <p className="type-display max-w-4xl text-light">{WALK_CLARITY}</p>
          </Reveal>
          <Reveal className="flex min-h-[55svh] items-center">
            <p className="type-display max-w-4xl text-light">
              Not yet is not <span className="text-emerald">no</span>.
            </p>
          </Reveal>
          <Reveal className="flex min-h-[55svh] items-center">
            <p className="type-display max-w-4xl text-light">{WALK_OBJECT}</p>
          </Reveal>
        </div>
      </section>

      <section id="waitlist" className="bg-navy px-5 pb-24 pt-[12vh] sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="hairline mb-[9vh]" aria-hidden />
          <div className="walk-waitlist-form">
            <div className="glass w-full max-w-sm p-6 sm:p-8">
              <WaitlistForm source="landing" idPrefix="landing-waitlist" surface="whisper" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
