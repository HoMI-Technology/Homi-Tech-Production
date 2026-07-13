import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Subprocessors",
  description: "The third-party service providers HōMI uses to deliver its Services.",
};

// Base list recovered verbatim from the v153 build (src/pages/SubprocessorsPage.tsx).
// The recovered build left the "Communications" and "AI and Machine Learning"
// categories with headings but no vendors; Resend and Anthropic are added here
// because the live product genuinely uses them (email delivery + the Companion).
// Counsel should confirm this list and the "Last updated" date before launch.
const SUBPROCESSORS: { category: string; vendors: { name: string; purpose: string }[] }[] = [
  {
    category: "Infrastructure",
    vendors: [
      { name: "Vercel, Inc.", purpose: "Cloud hosting and CDN" },
      { name: "Supabase, Inc.", purpose: "Database, authentication, and real-time services" },
    ],
  },
  {
    category: "Financial Services",
    vendors: [
      { name: "Plaid Inc.", purpose: "Financial account aggregation and data connectivity" },
      { name: "Stripe, Inc.", purpose: "Payment processing and subscription management" },
    ],
  },
  {
    category: "Analytics and Observability",
    vendors: [
      { name: "PostHog, Inc.", purpose: "Product analytics and event tracking" },
      { name: "Functional Software, Inc. (Sentry)", purpose: "Error tracking and performance monitoring" },
    ],
  },
  {
    category: "Communications",
    vendors: [{ name: "Resend (Plush, Inc.)", purpose: "Transactional email delivery" }],
  },
  {
    category: "AI and Machine Learning",
    vendors: [{ name: "Anthropic PBC", purpose: "AI Decision Companion responses" }],
  },
];

export default function SubprocessorsPage() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-black text-light">Subprocessors</h1>
        <p className="mt-3 text-sm text-dim">Last updated: July 2026</p>

        <div className="mt-10 space-y-10 text-dim">
          <div>
            <h2 className="text-xl font-bold text-light">Overview</h2>
            <p className="mt-3 leading-relaxed">
              {BRAND.legalEntity} uses third-party service providers
              (&ldquo;Subprocessors&rdquo;) to help deliver our Services. This page lists the
              Subprocessors we use and the purpose of each.
            </p>
            <p className="mt-3 leading-relaxed">
              We will notify users of material changes to our Subprocessor list via email at least
              30 days before the change takes effect.
            </p>
          </div>

          {SUBPROCESSORS.map((group) => (
            <div key={group.category}>
              <h2 className="text-xl font-bold text-light">{group.category}</h2>
              <ul className="mt-3 space-y-2 leading-relaxed">
                {group.vendors.map((v) => (
                  <li key={v.name}>
                    <span className="font-medium text-light">{v.name}</span> &mdash; {v.purpose}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
