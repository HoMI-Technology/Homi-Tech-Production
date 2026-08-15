import type { Metadata } from "next";
import { InterviewHero, IdeaBeat, WalkChapter, WalkPersist } from "@/components/home/InterviewHero";
import { CinemaFX } from "@/components/home/CinemaFX";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import { TAGLINES } from "@/lib/brand";
import { SITE_URL } from "@/lib/seo/site";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";

export const metadata: Metadata = {
  title: "Know When You're Ready — Decision Readiness Intelligence™",
  description:
    "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
  alternates: { canonical: "/" },
};

/**
 * Homepage walk — Knowledge brief: air over inventory.
 *
 * InterviewHero owns the locked first three beats. Assess and the compass
 * travel via WalkPersist — one instance each. Three jobs after the hero,
 * existing keep-list lines only. No AlignmentScene, no pin-scene, no fourth
 * slogan restating the hero inversion.
 *
 * One CinematicCompass for the walk. Waitlist is a whisper.
 * Never a fake 0–100 HōMI-Score.
 */
export default function MarketingHomePage() {
  return (
    <div>
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />
      <CinemaFX />

      <WalkPersist>
        <InterviewHero />

        <IdeaBeat id="statement">{TAGLINES.primary}</IdeaBeat>

        <IdeaBeat>
          Not yet is not <span className="text-emerald">no</span>.
        </IdeaBeat>

        <IdeaBeat
          object
          before={<div className="aspect-square w-[min(36vmin,14rem)]" aria-hidden />}
          headingClassName="type-h1 relative z-10 mt-6 max-w-2xl font-display font-semibold text-light"
        >
          The compass that becomes a key when you&rsquo;re finally ready to turn it.
        </IdeaBeat>

        <WalkChapter id="waitlist">
          <p className="text-sm text-dim">Clarity, not commission.</p>
          <div className="mt-20 w-full max-w-xs opacity-50 transition-opacity duration-300 hover:opacity-80 focus-within:opacity-90">
            <WaitlistForm source="landing" idPrefix="landing-waitlist" surface="whisper" />
          </div>
        </WalkChapter>
      </WalkPersist>
    </div>
  );
}
