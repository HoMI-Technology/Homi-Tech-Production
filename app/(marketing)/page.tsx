import type { Metadata } from "next";
import Link from "next/link";
import { InterviewHero } from "@/components/home/InterviewHero";
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
 * Benji craft on the hybrid front door.
 * One type axis. Air over inventory. Compass stays in the hero.
 * No card wall. No 01/02/03. Never a fake 0-100 HōMI-Score.
 */
export default function MarketingHomePage() {
  return (
    <div>
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />
      <CinemaFX />

      <InterviewHero />

      <section id="statement" className="scroll-mt-24 py-28 sm:py-36">
        <div className={AXIS}>
          <h2
            className="type-display max-w-2xl font-display font-normal"
            style={{ textWrap: "balance" }}
          >
            {TAGLINES.primary}
          </h2>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-dim">
            HōMI helps you evaluate readiness for the decision itself, across
            Financial Reality, Emotional Truth, and Perfect Timing.
          </p>
          <p className="mt-4 max-w-xl text-lg text-dim">
            HōMI enters before the commitment.
          </p>
          <p className="mt-16 max-w-2xl font-display text-3xl text-light sm:text-4xl">
            Not yet is not <span className="text-emerald">no</span>.
          </p>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-dim">
            The compass that becomes a key when you&rsquo;re finally ready to turn it.
          </p>
        </div>
      </section>

      <section className="py-28 sm:py-36">
        <div className={AXIS}>
          <div className="max-w-xl space-y-16">
            {STEPS.map((item) => (
              <div key={item.title}>
                <h2 className="font-display text-3xl font-normal text-light sm:text-4xl">
                  {item.title}
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-dim">{item.copy}</p>
              </div>
            ))}
          </div>
          <p className="mt-16">
            <Link href="/how-it-works" className="text-sm text-dim hover:text-cyan">
              See how it works
            </Link>
          </p>
        </div>
      </section>

      <section className="py-28 sm:py-36">
        <div className={AXIS}>
          <h2 className="font-display text-3xl font-normal text-light sm:text-4xl">
            What HōMI is not
          </h2>
          <ul className="mt-12 max-w-xl space-y-10">
            {NOT_ITEMS.map((item) => (
              <li key={item.title}>
                <p className="text-lg text-light">{item.title}</p>
                <p className="mt-2 text-base leading-relaxed text-dim">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="waitlist" className="scroll-mt-24 py-28 sm:py-36">
        <div className={AXIS}>
          <p className="type-display max-w-2xl font-display font-normal text-light">
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
