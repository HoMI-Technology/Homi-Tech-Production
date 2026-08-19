import type { Metadata } from "next";
import { InterviewHero } from "@/components/home/InterviewHero";

import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, softwareApplicationJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/seo/site";
import { pageMetadata } from "@/lib/seo/metadata";
import { PaperScene } from "@/components/home/PaperScene";
import {
  Clarity,
  CloseCta,
  FriendFrame,
  Pillars,
  Steps,
  VerdictSpectrum,
  WrongQuestion,
} from "@/components/home/FrontDoor";

export const metadata: Metadata = pageMetadata({
  title: "Know When You're Ready — Decision Readiness Intelligence™",
  description:
    "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
  path: "/",
});

/**
 * Front door — hero (question, inversion, Assess, hero-scale compass),
 * then the lit field: companion frame, pillars, verdict spectrum,
 * steps, clarity, and a grid-floor close. Native scroll; no pin.
 */
export default function MarketingHomePage() {
  return (
    <>
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />
      <JsonLd data={softwareApplicationJsonLd(SITE_URL)} />

      <InterviewHero />

      <div aria-hidden className="bg-navy px-5 sm:px-6 lg:px-8">
        <div className="hairline mx-auto w-full max-w-7xl" />
      </div>

      {/* The lit field: every mid-page section sits in the same volumetric
          atmosphere (pointer light + 3D arrivals). Verdict labels, colors,
          and ranges are imported/derived from lib/brand and lib/scoring —
          this page cannot contradict the engine. */}
      <div className="bg-navy">
        <PaperScene>
          <div className="relative z-10">
            <FriendFrame />
            <WrongQuestion />
            <Pillars />
            <VerdictSpectrum />
            <Steps />
            <Clarity />
          </div>
        </PaperScene>
      </div>

      <CloseCta />
    </>
  );
}
