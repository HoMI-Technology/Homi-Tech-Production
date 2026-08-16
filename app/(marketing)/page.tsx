import type { Metadata } from "next";
import Link from "next/link";
import { InterviewHero } from "@/components/home/InterviewHero";
import { CinematicCompass } from "@/components/home/CinematicCompass";
import { CinemaFX } from "@/components/home/CinemaFX";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import { TAGLINES } from "@/lib/brand";
import { SITE_URL } from "@/lib/seo/site";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import {
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL,
} from "@/components/marketing/first-moment-copy";

export const metadata: Metadata = {
  title: "Know When You're Ready — Decision Readiness Intelligence™",
  description:
    "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
  alternates: { canonical: "/" },
};

const STEPS = [
  {
    title: "Assess",
    copy: "Answer honest questions across Financial Reality, Emotional Truth, and Perfect Timing. Sliders, not essays.",
  },
  {
    title: "Verdict",
    copy: "You get an honest verdict. Hard-stops override the math when something is not safe to build on.",
  },
  {
    title: "Build",
    copy: "Not yet is a starting line, not a wall. You get a map: the specific, ordered things to build first.",
  },
] as const;

const NOT_ITEMS = [
  {
    title: "Not a lender or broker",
    body: "No loans originated, no transactions pushed.",
  },
  {
    title: "Not a credit bureau",
    body: "A different question than repayment risk.",
  },
  {
    title: "Not financial advice",
    body: "Educational decision-readiness guidance only.",
  },
] as const;

const AXIS = "mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8";

/**
 * TeraFab craft (Benji Taylor / Tesla-SpaceX site), HōMI words.
 * Full scenes. Giant type. One object. Hairline rows. No card wall.
 * Never a fake 0-100 HōMI-Score.
 */
export default function MarketingHomePage() {
  return (
    <div className="tf-page">
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />
      <CinemaFX />

      <InterviewHero />

      <section
        id="statement"
        className="tf-scene relative flex min-h-[100dvh] flex-col justify-end pb-24 pt-32"
      >
        <div className={AXIS}>
          <h2
            className="type-giant max-w-4xl font-display font-semibold"
            style={{ textWrap: "balance" }}
          >
            {TAGLINES.primary}
          </h2>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-dim sm:text-xl">
            HōMI helps you evaluate readiness for the decision itself, across
            Financial Reality, Emotional Truth, and Perfect Timing.
          </p>
          <p className="mt-4 max-w-xl text-lg text-dim sm:text-xl">
            HōMI enters before the commitment.
          </p>
        </div>
      </section>

      <section className="tf-scene relative flex min-h-[100dvh] flex-col justify-end pb-24 pt-32">
        <div className={AXIS}>
          <p className="type-giant max-w-4xl font-display font-semibold text-light">
            Not yet is not <span className="text-emerald">no</span>.
          </p>
        </div>
      </section>

      <section className="tf-scene relative flex min-h-[100dvh] flex-col justify-end overflow-hidden pb-24 pt-32">
        <div className="tf-object-compass" aria-hidden>
          <CinematicCompass responsive keyholePulse={false} />
        </div>
        <div className={AXIS}>
          <p className="type-display max-w-3xl font-display font-normal text-light">
            The compass that becomes a key when you&rsquo;re finally ready to turn it.
          </p>
        </div>
      </section>

      <section className="tf-scene relative flex min-h-[100dvh] flex-col justify-end pb-24 pt-32">
        <div className={AXIS}>
          <ul className="tf-rows max-w-3xl">
            {STEPS.map((item) => (
              <li key={item.title}>
                <span>{item.title}</span>
                <span>{item.copy}</span>
              </li>
            ))}
          </ul>
          <p className="mt-12">
            <Link href="/how-it-works" className="text-sm text-dim hover:text-light">
              See how it works
            </Link>
          </p>
        </div>
      </section>

      <section className="tf-scene relative flex min-h-[100dvh] flex-col justify-end pb-24 pt-32">
        <div className={AXIS}>
          <h2 className="type-display max-w-3xl font-display font-normal">
            What HōMI is not
          </h2>
          <ul className="tf-rows mt-12 max-w-3xl">
            {NOT_ITEMS.map((item) => (
              <li key={item.title}>
                <span>{item.title}</span>
                <span>{item.body}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="waitlist"
        className="tf-scene relative flex min-h-[100dvh] flex-col justify-end pb-28 pt-32"
      >
        <div className={AXIS}>
          <p className="type-giant max-w-3xl font-display font-semibold text-light">
            Clarity, not commission.
          </p>
          <Link
            href={`${PRIMARY_CLOSE_HREF}?src=home`}
            className="btn btn-primary mt-10 px-8 py-3.5 text-base"
          >
            {PRIMARY_CLOSE_LABEL}
          </Link>
          <div className="walk-waitlist-form mt-16 w-full max-w-sm">
            <WaitlistForm
              source="landing"
              idPrefix="landing-waitlist"
              surface="whisper"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
