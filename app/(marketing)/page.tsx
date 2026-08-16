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
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Know When You're Ready — Decision Readiness Intelligence™",
  description:
    "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
  alternates: { canonical: "/" },
};

const STEPS = [
  {
    step: "01",
    title: "Assess",
    copy: "Answer honest questions across Financial Reality, Emotional Truth, and Perfect Timing. Sliders, not essays.",
  },
  {
    step: "02",
    title: "Verdict",
    copy: "You get an honest verdict. Hard-stops override the math when something is not safe to build on.",
  },
  {
    step: "03",
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
 * Hybrid front door — still hero, then a readable page.
 * Locked lines stay character-matched. Never a fake 0–100 HōMI-Score.
 */
export default function MarketingHomePage() {
  return (
    <div>
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />
      <CinemaFX />

      <InterviewHero />

      <Reveal>
        <section id="statement" className="scroll-mt-24 px-6 py-24">
          <div className="mx-auto max-w-3xl">
            <h2
              className="type-display max-w-2xl font-display font-normal"
              style={{ textWrap: "balance" }}
            >
              {TAGLINES.primary}
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-dim">
              HōMI helps you evaluate readiness for the decision itself —
              across Financial Reality, Emotional Truth, and Perfect Timing.
            </p>
            <p className="mt-4 max-w-2xl text-lg text-dim">
              HōMI enters before the commitment.
            </p>
            <p className="mt-10 max-w-2xl font-display text-2xl text-light">
              Not yet is not <span className="text-emerald">no</span>.
            </p>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-dim">
              The compass that becomes a key when you&rsquo;re finally ready to turn it.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="type-h2">How HōMI works</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((item) => (
                <div key={item.step} className="glass glass-hover p-8">
                  <span className="score-numeral text-sm text-dim">{item.step}</span>
                  <h3 className="mt-3 type-h3">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-dim">{item.copy}</p>
                </div>
              ))}
            </div>
            <p className="mt-8">
              <Link href="/how-it-works" className="text-sm text-cyan hover:underline">
                See how it works
              </Link>
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="type-h2">What HōMI is not</h2>
            <div className="mt-8 space-y-5">
              {NOT_ITEMS.map((item) => (
                <div key={item.title} className="glass p-6">
                  <p className="font-semibold text-light">{item.title}</p>
                  <p className="mt-1 text-sm text-dim">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="waitlist" className="scroll-mt-24 px-6 py-24">
          <div className="mx-auto max-w-xl">
            <p className="type-h2 font-display font-semibold text-light">
              Clarity, not commission.
            </p>
            <Link
              href={`${PRIMARY_CLOSE_HREF}?src=home`}
              className="btn btn-primary mt-8 px-8 py-3.5 text-base"
            >
              {PRIMARY_CLOSE_LABEL}
            </Link>
            <div className="walk-waitlist-form mt-12 w-full max-w-sm">
              <WaitlistForm
                source="landing"
                idPrefix="landing-waitlist"
                surface="whisper"
              />
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
