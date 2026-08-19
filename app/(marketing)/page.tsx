import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InterviewHero } from "@/components/home/InterviewHero";
import { CompassFilter } from "@/components/home/CompassFilter";
import { ObjectReveal } from "@/components/home/ObjectReveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import { PILLARS, TAGLINES } from "@/lib/brand";
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

/**
 * TeraFab craft, HōMI identity.
 *
 * Built against the real reference (terafab.ai), not a memory of it: flat
 * ground, restrained display type at weight 300, a 12-column structural
 * guide overlay, hairline tier rows that light on entry, and flush
 * hard-edged object panels on the grid.
 *
 * Never a fake 0-100 HōMI-Score.
 */
export default function MarketingHomePage() {
  return (
    <div className="tf-page">
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />
      <CompassFilter />

      <div className="tf-guides" aria-hidden>
        <div className="tf-shell h-full">
          <div className="tf-guides-grid">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>
      </div>

      <InterviewHero />

      <section id="statement" className="tf-scene tf-state">
        <div className="tf-shell">
          <p className="tf-statement max-w-3xl" style={{ textWrap: "balance" }}>
            {TAGLINES.primary}
          </p>
          <p className="tf-body mt-8 max-w-xl">
            HōMI helps you evaluate readiness for the decision itself, across Financial Reality,
            Emotional Truth, and Perfect Timing.
          </p>
          <p className="tf-body mt-3 max-w-xl">HōMI enters before the commitment.</p>

          <ul className="tf-rows mt-10">
            {PILLARS.map((pillar) => (
              <li key={pillar.key}>
                <span className="tf-term">{pillar.name}</span>
                <span className="tf-gloss">{pillar.question}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="tf-scene tf-block">
        <div className="tf-shell">
          <h2 className="type-display max-w-3xl font-light">
            Not yet is not <span className="text-emerald">no</span>.
          </h2>
        </div>
      </section>

      <ObjectReveal className="tf-object-scene tf-scene tf-block">
        <div className="tf-shell">
          <span className="tf-code">The object</span>
          <div className="tf-panel mt-8">
            <Image
              src="/marketing/home/object-key.jpg"
              alt=""
              width={1280}
              height={720}
              sizes="(min-width: 48rem) 566px, 90vw"
            />
          </div>
          <p className="tf-statement mt-10 max-w-2xl">
            The compass that becomes a key when you&rsquo;re finally ready to turn it.
          </p>
        </div>
      </ObjectReveal>

      <section className="tf-scene tf-block">
        <div className="tf-shell">
          <h2 className="type-display max-w-2xl font-light">How it works</h2>
          <ul className="tf-rows tf-rows--wide mt-10">
            {STEPS.map((item) => (
              <li key={item.title}>
                <span className="tf-term">{item.title}</span>
                <span className="tf-gloss">{item.copy}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8">
            <Link href="/how-it-works" className="tf-body hover:text-light">
              See how it works
            </Link>
          </p>
        </div>
      </section>

      <section className="tf-scene tf-block">
        <div className="tf-shell">
          <h2 className="type-display max-w-2xl font-light">What HōMI is not</h2>
          <ul className="tf-rows tf-rows--wide mt-10">
            {NOT_ITEMS.map((item) => (
              <li key={item.title}>
                <span className="tf-term">{item.title}</span>
                <span className="tf-gloss">{item.body}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="waitlist" className="tf-scene tf-block">
        <div className="tf-shell">
          <h2 className="type-giant max-w-2xl font-light">Clarity, not commission.</h2>
          <Link
            href={`${PRIMARY_CLOSE_HREF}?src=home`}
            className="btn btn-primary mt-10 px-8 py-3.5 text-base"
          >
            {PRIMARY_CLOSE_LABEL}
          </Link>
          <div className="walk-waitlist-form mt-16 w-full max-w-sm">
            <WaitlistForm source="landing" idPrefix="landing-waitlist" surface="whisper" />
          </div>
        </div>
      </section>
    </div>
  );
}
