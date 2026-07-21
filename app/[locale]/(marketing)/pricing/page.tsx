import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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

interface Faq {
  q: string;
  a: string;
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const faqs = t.raw("faqs") as Faq[];

  return (
    <>
      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black text-light md:text-5xl">{t("title")}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">
            {t("tagline")}
          </p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-10">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-4">
            {TIERS.map((tier) => {
              const features = t.raw(`tiers.${tier.id}.features`) as string[];
              return (
                <div
                  key={tier.id}
                  className={`glass glass-hover flex flex-col p-8 ${
                    tier.highlight ? "border-cyan/40" : ""
                  }`}
                >
                  {tier.highlight && (
                    <span className="mb-4 inline-block w-fit rounded-full border border-cyan/40 px-3 py-1 text-xs font-semibold text-cyan">
                      {t("mostComplete")}
                    </span>
                  )}
                  <h2 className="text-xl font-bold text-light">{t(`tiers.${tier.id}.name`)}</h2>
                  <p className="mt-1 text-sm text-dim">{t(`tiers.${tier.id}.description`)}</p>
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
                      <Link href="/shadow-score" className="btn btn-ghost w-full">
                        {t("getShadowScore")}
                      </Link>
                    ) : (
                      <PricingCheckoutButton
                        tier={tier.id as "plus" | "pro" | "family"}
                        label={t(`tiers.${tier.id}.cta`)}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-xl text-light">
              {t("zeroLine")}
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-black text-light md:text-4xl">
              {t("questionsTitle")}
            </h2>
            <div className="mt-10 space-y-4">
              {faqs.map((item) => (
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
              {t("finalTitle")}
            </h2>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/shadow-score" className="btn btn-primary">
                {t("getScore")}
              </Link>
              <Link href="/how-it-works" className="btn btn-ghost">
                {t("howItWorks")}
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
