import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { PricingCheckoutButton } from "@/components/marketing/PricingCheckoutButton";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPageJsonLd } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "HōMI pricing: a free 45-question assessment with the same engine and hard stops, Plus for the voice picker and verdict history, and Family for two people on one compass. Our revenue comes from subscriptions, not transactions.",
  path: "/pricing",
});

interface PricingTier {
  id: "free" | "plus" | "pro" | "family";
  price: string;
  cadence: string;
  highlight?: boolean;
}

/** Price/cadence are market data, not copy — they stay in code. */
const TIERS: PricingTier[] = [
  { id: "free", price: "$0", cadence: "" },
  { id: "plus", price: "$9.99", cadence: "/mo" },
  { id: "pro", price: "$24.99", cadence: "/mo", highlight: true },
  { id: "family", price: "$39.99", cadence: "/mo" },
];

interface TierCopy {
  name: string;
  description: string;
  features: string[];
  cta: string;
}

const TIER_COPY: Record<PricingTier["id"], TierCopy> = {
  free: {
    name: "Free",
    description: "Start with the truth. No card required.",
    features: [
      "Full 45-question assessment — same engine, bands, and hard stops",
      "Protective verdict and Path — same quality as paid.",
      "Results, Path, and Money",
      "Educational tools",
    ],
    cta: PRIMARY_CLOSE_LABEL,
  },
  plus: {
    name: "Plus",
    description: "For anyone actively building toward readiness.",
    features: [
      "Everything in Free",
      "Verdict in your companion's voice (Steady, Clarity, or Horizon).",
      "Verdict history",
    ],
    cta: "Start Plus",
  },
  pro: {
    name: "Pro",
    description: "Everything in Plus.",
    features: ["Everything in Plus", "Higher daily ask-about-this-verdict limits."],
    cta: "Start Pro",
  },
  family: {
    name: "Family",
    description: "Two people. One compass.",
    features: [
      "Everything in Pro for two people",
      "The slower-person pillar sets the pace",
      "One compass for both",
    ],
    cta: "Start Family",
  },
};

interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  {
    q: "Why do you charge at all if you’re not selling a transaction?",
    a: "Someone has to pay for an honest voice to exist. We charge a subscription rather than taking commissions, so what HōMI earns doesn’t depend on what you decide.",
  },
  {
    q: "What happens if HōMI tells me DO NOT PROCEED?",
    a: "You still keep your report, your plan, and access to the tools. DO NOT PROCEED comes with a map for what to build first — it’s not a wall, it’s a starting line.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There’s no lock-in and no retention maze. Cancel from your account settings whenever you want; you keep access through the end of the billing period.",
  },
  {
    q: "Do you sell my financial data?",
    a: "No. Never. See our privacy policy for the full detail, but the short version is: your data is yours, and it isn’t for sale.",
  },
  {
    q: "Is HōMI financial advice?",
    a: "No. HōMI is a Decision Companion: educational guidance only. It helps you see your own situation clearly — it doesn’t recommend products, and it isn’t a substitute for a licensed advisor.",
  },
];

export default function PricingPage() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(FAQS)} />
      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="type-h1">Pricing</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">
            Our revenue comes from subscriptions, not transactions.
          </p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier, i) => {
              const copy = TIER_COPY[tier.id];
              const features = copy.features;
              return (
                <Reveal key={tier.id} delay={(i % 4) * 80}>
                  <div
                    className={`glass glass-hover flex h-full flex-col p-6 sm:p-8 ${
                      tier.highlight ? "border-cyan/40" : ""
                    }`}
                  >
                    {tier.highlight && (
                      <span className="mb-4 inline-block w-fit rounded-full border border-cyan/40 px-3 py-1 text-xs font-semibold text-cyan">
                        Most complete
                      </span>
                    )}
                    <h2 className="type-h3">{copy.name}</h2>
                    <p className="mt-1 text-sm text-dim">{copy.description}</p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="score-numeral text-4xl font-bold text-light">
                        {tier.price}
                      </span>
                      {tier.cadence && <span className="text-sm text-dim">{tier.cadence}</span>}
                    </div>

                    <ul className="mt-6 flex-1 space-y-3">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-dim">
                          <svg
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M4 10l4 4 8-8" />
                          </svg>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8">
                      {tier.id === "free" ? (
                        <Link href={PRIMARY_CLOSE_HREF} className="btn btn-ghost w-full">
                          {copy.cta}
                        </Link>
                      ) : (
                        <PricingCheckoutButton
                          tier={tier.id as "plus" | "pro" | "family"}
                          label={copy.cta}
                          className="w-full"
                        />
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-xl text-light">
              No commissions. No referral fees. Your subscription price doesn&rsquo;t change based
              on what you decide.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center type-h2">Questions</h2>
            <div className="mt-10 space-y-4">
              {FAQS.map((item) => (
                <div key={item.q} className="glass p-6">
                  <h3 className="type-h4">{item.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-dim">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="type-h1">Start with the full assessment.</h2>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href={PRIMARY_CLOSE_HREF} className="btn btn-primary">
                {PRIMARY_CLOSE_LABEL}
              </Link>
              <Link href="/how-it-works" className="btn btn-ghost">
                How it works
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
