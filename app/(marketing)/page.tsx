import type { Metadata } from "next";
import Link from "next/link";
import { InterviewHero, IdeaBeat, WalkChapter } from "@/components/home/InterviewHero";
import { CinemaFX } from "@/components/home/CinemaFX";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/schema";
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
 * Homepage walk — TeraFab rhythm: one idea per scroll, all the way down.
 *
 * InterviewHero owns the locked first three beats + Assess on first paint.
 * Everything after is the same IdeaBeat / WalkChapter primitive. No tables,
 * comparison grids, kicker+card walls, or product-tour theater.
 *
 * Copy is existing homepage lines only. Waitlist stays a quiet last close,
 * secondary to Assess. Never present a fake 0–100 HōMI-Score.
 */
export default function MarketingHomePage() {
  return (
    <div>
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />
      <CinemaFX />

      <InterviewHero />

      <section className="border-t border-white/[0.04] px-6 py-5">
        <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-dim sm:text-sm">
          <span className="font-medium text-emerald/90">
            Educational only &mdash; not financial advice.
          </span>{" "}
          HōMI provides educational guidance only. Consider consulting qualified professionals
          before making legal, tax, mortgage, investment, or real estate decisions.
        </p>
      </section>

      <IdeaBeat
        id="statement"
        after={
          <>
            <p className="mx-auto mt-8 max-w-xl text-lg text-dim sm:text-xl">
              HōMI helps you know if you can trust the decision.
            </p>
            <blockquote className="mx-auto mt-12 max-w-2xl font-display text-xl leading-relaxed text-light/80">
              &ldquo;Most people don&rsquo;t regret what they bought. They regret when they bought
              it.&rdquo;
            </blockquote>
          </>
        }
      >
        A credit score tells institutions if they may trust your history.
      </IdeaBeat>

      <IdeaBeat>Everyone asks the wrong question.</IdeaBeat>

      <IdeaBeat
        after={
          <p className="mx-auto mt-8 max-w-xl text-lg text-dim sm:text-xl">
            HōMI enters before the commitment.
          </p>
        }
      >
        Most systems arrive after you decide.
      </IdeaBeat>

      <IdeaBeat>
        Not yet is not <span className="text-emerald">no</span>.
      </IdeaBeat>

      <WalkChapter id="waitlist">
        <Link href={PRIMARY_CLOSE_HREF} className="btn btn-primary btn-glow px-8 py-3.5 text-base">
          {PRIMARY_CLOSE_LABEL}
        </Link>
        <p className="mx-auto mt-16 max-w-xl text-sm leading-relaxed text-dim">
          Leave your email. We&rsquo;ll tell you when it&rsquo;s your turn &mdash; the truth, not a
          sales sequence.
        </p>
        <div className="mx-auto mt-8 w-full max-w-md">
          <WaitlistForm source="landing" idPrefix="landing-waitlist" />
        </div>
      </WalkChapter>
    </div>
  );
}
