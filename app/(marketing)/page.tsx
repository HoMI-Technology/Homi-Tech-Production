import type { Metadata } from "next";
import { InterviewHero } from "@/components/home/InterviewHero";
import { WALK_CLARITY, WALK_COMPANION, WALK_OBJECT, WALK_PRIMARY } from "@/components/home/walk-copy";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/seo/site";
import { Reveal } from "@/components/ui/Reveal";
import { PaperScene } from "@/components/home/PaperScene";

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

      {/* Lit scenes: each locked line owns a 55svh frame with its own
          volumetric light and a 3D perspective arrival (CSS only — the same
          physics family as the hero gyroscope). Native scroll; no-JS and
          reduced-motion render fully lit and flat. */}
      <section className="bg-navy">
        <PaperScene>
          <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-5 py-12 sm:px-6 lg:px-8">
            <Reveal className="line-light line-glow-cyan flex min-h-[55svh] items-center">
              <p className="type-display max-w-4xl text-light">{WALK_COMPANION}</p>
            </Reveal>
            <Reveal className="line-light line-glow-cyan flex min-h-[55svh] items-center">
              <p className="type-display max-w-4xl text-light">{WALK_PRIMARY}</p>
            </Reveal>
            <Reveal className="line-light line-glow-cyan flex min-h-[55svh] items-center">
              <p className="type-display max-w-4xl text-light">{WALK_CLARITY}</p>
            </Reveal>
            <Reveal className="line-light line-glow-emerald flex min-h-[55svh] items-center">
              <p className="type-display max-w-4xl text-light">
                Not yet is not <span className="text-emerald">no</span>.
              </p>
            </Reveal>
            <Reveal className="line-light line-glow-yellow flex min-h-[55svh] items-center">
              <p className="type-display max-w-4xl text-light">{WALK_OBJECT}</p>
            </Reveal>
          </div>
        </PaperScene>
      </section>
    </>
  );
}
