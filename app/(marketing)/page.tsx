import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InterviewHero } from "@/components/home/InterviewHero";
import { ObjectReveal } from "@/components/home/ObjectReveal";
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

const STEPS = [
  {
    numeral: "I",
    title: "Assess",
    copy: "Answer honest questions across Financial Reality, Emotional Truth, and Perfect Timing. Sliders, not essays.",
  },
  {
    numeral: "II",
    title: "Verdict",
    copy: "You get an honest verdict. Hard-stops override the math when something is not safe to build on.",
  },
  {
    numeral: "III",
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
 * TeraFab craft (Benji Taylor), HōMI identity.
 *
 * One idea per viewport. One left axis. Giant Fraunces, mono index marks,
 * hairline rows — no card wall, no glass, no numbered step chips. The
 * compass is the single object and it stands in the void at its native
 * resolution rather than stretching across the viewport.
 *
 * Accent budget: cyan twice (hero rule, CTA), emerald once (“no”).
 * Never a fake 0-100 HōMI-Score.
 */
export default function MarketingHomePage() {
  return (
    <div className="tf-page">
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />

      <InterviewHero />

      <section id="statement" className="tf-scene py-28 sm:py-40">
        <div className={AXIS}>
          <div className="tf-rule max-w-5xl">
            <span className="tf-mark">I — Thesis</span>
          </div>
          <h2
            className="type-giant mt-12 max-w-5xl font-display font-semibold"
            style={{ textWrap: "balance" }}
          >
            {TAGLINES.primary}
          </h2>
          <p className="mt-12 max-w-xl text-lg leading-relaxed text-dim sm:text-xl">
            HōMI helps you evaluate readiness for the decision itself, across Financial Reality,
            Emotional Truth, and Perfect Timing.
          </p>
          <p className="mt-5 max-w-xl text-lg text-dim sm:text-xl">
            HōMI enters before the commitment.
          </p>
        </div>
      </section>

      <section className="tf-scene flex min-h-[72dvh] flex-col justify-center py-16">
        <div className={AXIS}>
          <p className="type-giant max-w-4xl font-display font-semibold text-light">
            Not yet is not <span className="text-emerald">no</span>.
          </p>
        </div>
      </section>

      <ObjectReveal className="tf-object-scene tf-scene py-24 sm:py-32">
        <div className={AXIS}>
          <div className="tf-rule">
            <span className="tf-mark">II — The object</span>
          </div>
          <div className="tf-object-plate mt-16">
            <Image
              src="/marketing/home/object-key.jpg"
              alt=""
              width={1280}
              height={720}
              sizes="(max-width: 47.99rem) 88vw, 56rem"
              className="tf-media"
            />
          </div>
          <p className="type-display mt-16 max-w-3xl font-display font-normal text-light">
            The compass that becomes a key when you&rsquo;re finally ready to turn it.
          </p>
        </div>
      </ObjectReveal>

      <section className="tf-scene py-28 sm:py-36">
        <div className={AXIS}>
          <div className="tf-rule max-w-5xl">
            <span className="tf-mark">III — Method</span>
          </div>
          <ul className="tf-index mt-16 max-w-5xl">
            {STEPS.map((item) => (
              <li key={item.title}>
                <span className="tf-numeral">{item.numeral}</span>
                <span className="tf-term">{item.title}</span>
                <span className="tf-gloss">{item.copy}</span>
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

      <section className="tf-scene py-24 sm:py-32">
        <div className={AXIS}>
          <div className="tf-rule max-w-5xl">
            <span className="tf-mark">IV — Boundaries</span>
          </div>
          <h2 className="type-display mt-12 max-w-3xl font-display font-normal">
            What HōMI is not
          </h2>
          <ul className="tf-not mt-14 max-w-5xl">
            {NOT_ITEMS.map((item) => (
              <li key={item.title}>
                <p>{item.title}</p>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="waitlist"
        className="tf-scene flex min-h-[86dvh] flex-col justify-center pb-32 pt-24"
      >
        <div className={AXIS}>
          <div className="tf-rule max-w-5xl">
            <span className="tf-mark">V — Close</span>
          </div>
          <p className="type-giant mt-12 max-w-3xl font-display font-semibold text-light">
            Clarity, not commission.
          </p>
          <Link
            href={`${PRIMARY_CLOSE_HREF}?src=home`}
            className="btn btn-primary mt-12 px-8 py-3.5 text-base"
          >
            {PRIMARY_CLOSE_LABEL}
          </Link>
          <div className="walk-waitlist-form mt-20 w-full max-w-sm">
            <WaitlistForm source="landing" idPrefix="landing-waitlist" surface="whisper" />
          </div>
        </div>
      </section>
    </div>
  );
}
