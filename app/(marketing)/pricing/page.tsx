import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { PricingCheckoutButton } from "@/components/marketing/PricingCheckoutButton";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "HōMI pricing: a free Shadow Score, and paid tiers for unlimited assessments, the Decision Companion, and household plans. We profit when you're ready — not when you transact.",
  alternates: { canonical: "/pricing" },
};

interface PricingTier {
  id: "free" | "plus" | "pro" | "family";
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  cta: string | null;
  highlight?: boolean;
}

const TIERS: PricingTier[] = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    cadence: "",
    description: "Start with the truth. No card required.",
    features: [
      "Shadow Score — a 90-second read on where you stand",
      "One full assessment across all three pillars",
      "Basic finance tools",
    ],
    cta: null,
  },
  {
    id: "plus" as const,
    name: "Plus",
    price: "$9.99",
    cadence: "/mo",
    description: "For anyone actively building toward readiness.",
    features: [
      "Unlimited assessments",
      "Full readiness report across all pillars",
      "A transformation plan built around your gaps",
      "Private journal to track the moment before",
    ],
    cta: "Start Plus",
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$24.99",
    cadence: "/mo",
    description: "Everything in Plus, with a companion who talks back.",
    features: [
      "Everything in Plus",
      "Decision Companion conversations",
      "Couples mode for shared decisions",
      "Behavioral genome across your decision history",
      "Priority signal alerts as your readiness shifts",
    ],
    cta: "Start Pro",
    highlight: true,
  },
  {
    id: "family" as const,
    name: "Family",
    price: "$39.99",
    cadence: "/mo",
    description: "Everything in Pro, for the whole household.",
    features: [
      "Everything in Pro for up to 5 household members",
      "Shared dashboards across the family",
      "One account, one honest picture for everyone in it",
    ],
    cta: "Start Family",
  },
];

const FAQS = [
  {
    q: "Why do you charge at all if you're not selling a transaction?",
    a: "Someone has to pay for an honest voice to exist. We chose subscriptions over commissions on purpose — we profit when you're ready, not when you transact. That's the whole point of zero conflict of interest.",
  },
  {
    q: "What happens if HōMI tells me NOT YET?",
    a: "You still keep your report, your plan, and access to the tools. NOT YET comes with a map for what to build first — it's not a wall, it's a starting line.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There's no lock-in and no retention maze. Cancel from your account settings whenever you want; you keep access through the end of the billing period.",
  },
  {
    q: "Do you sell my financial data?",
    a: "No. Never. See our privacy policy for the full detail, but the short version is: your data is yours, and it isn't for sale.",
  },
  {
    q: "Is the Decision Companion financial advice?",
    a: "No. HōMI provides educational guidance only. The Companion helps you see your own situation clearly — it doesn't recommend products, and it isn't a substitute for a licensed advisor.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black text-light md:text-5xl">Pricing</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">
            We profit when you&rsquo;re ready. Not when you transact.
          </p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-10">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-4">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`glass glass-hover flex flex-col p-8 ${
                  "highlight" in tier && tier.highlight ? "border-cyan/40" : ""
                }`}
              >
                {"highlight" in tier && tier.highlight && (
                  <span className="mb-4 inline-block w-fit rounded-full border border-cyan/40 px-3 py-1 text-xs font-semibold text-cyan">
                    Most complete
                  </span>
                )}
                <h2 className="text-xl font-bold text-light">{tier.name}</h2>
                <p className="mt-1 text-sm text-dim">{tier.description}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="score-numeral text-4xl font-bold text-light">
                    {tier.price}
                  </span>
                  {tier.cadence && <span className="text-sm text-dim">{tier.cadence}</span>}
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {tier.features.map((f) => (
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
                    <Link href="/shadow-score" className="btn btn-ghost w-full">
                      Get your Shadow Score
                    </Link>
                  ) : (
                    <PricingCheckoutButton
                      tier={tier.id as "plus" | "pro" | "family"}
                      label={tier.cta ?? `Start ${tier.name}`}
                      className="w-full"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-xl text-light">
              We have zero commissions. Zero referral fees. Zero incentive to push you either
              way.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-black text-light md:text-4xl">
              Questions
            </h2>
            <div className="mt-10 space-y-4">
              {FAQS.map((item) => (
                <div key={item.q} className="glass p-6">
                  <h3 className="font-semibold text-light">{item.q}</h3>
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
            <h2 className="text-3xl font-black text-light md:text-4xl">
              Start with the free score.
            </h2>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/shadow-score" className="btn btn-primary">
                Get your score — 90 seconds
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
