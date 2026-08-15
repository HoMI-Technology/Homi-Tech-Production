import type { Metadata } from "next";
import Link from "next/link";
import { InterviewHero, IdeaBeat, WalkChapter } from "@/components/home/InterviewHero";
import { CinematicCompass } from "@/components/home/CinematicCompass";
import { CinemaFX } from "@/components/home/CinemaFX";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import { TAGLINES } from "@/lib/brand";
import { SITE_URL } from "@/lib/seo/site";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";

export const metadata: Metadata = {
  title: "Know When You're Ready — Decision Readiness Intelligence™",
  description:
    "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
  alternates: { canonical: "/" },
};

/**
 * Homepage walk — Knowledge brief: air over inventory.
 *
 * InterviewHero owns the locked first three beats + Assess on first paint.
 * Three jobs after that, existing keep-list lines only. No AlignmentScene,
 * no pin-scene, no fourth slogan restating the hero inversion.
 *
 * One CinematicCompass on the object beat (canonical 4:3:2). Waitlist is a
 * whisper under Assess. Never a fake 0–100 HōMI-Score.
 */
export default function MarketingHomePage() {
  return (
    <div>
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />
      <CinemaFX />

      <InterviewHero />

      <IdeaBeat id="statement">{TAGLINES.primary}</IdeaBeat>

      <IdeaBeat>
        Not yet is not <span className="text-emerald">no</span>.
      </IdeaBeat>

      <WalkChapter>
        <div className="w-[min(36vmin,14rem)]" aria-hidden>
          <CinematicCompass responsive keyholePulse={false} />
        </div>
        <h2
          className="type-h1 relative z-10 mt-6 max-w-2xl font-display font-semibold text-light"
          style={{ textWrap: "balance" }}
        >
          The compass that becomes a key when you&rsquo;re finally ready to turn it.
        </h2>
      </WalkChapter>

      <WalkChapter id="waitlist">
        <Link href={PRIMARY_CLOSE_HREF} className="btn btn-primary btn-sm">
          {PRIMARY_CLOSE_LABEL}
        </Link>
        <p className="mt-6 text-sm text-dim">Clarity, not commission.</p>
        <div className="mt-10 w-full max-w-md">
          <WaitlistForm source="landing" idPrefix="landing-waitlist" surface="whisper" />
        </div>
      </WalkChapter>
    </div>
  );
}
