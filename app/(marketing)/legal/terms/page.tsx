import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of HōMI, including our educational-only guidance, accounts, subscriptions, and liability limitations.",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="type-h1">Terms of Service</h1>
        <p className="mt-3 text-sm text-dim">Last updated: July 2026</p>

        <div className="mt-10 space-y-10 text-dim">
          <div>
            <h2 className="type-h3">1. Agreement</h2>
            <p className="mt-3 leading-relaxed">
              These Terms of Service govern your use of {BRAND.display}, a product of{" "}
              {BRAND.legalEntity}. By creating an account or using our assessment, Decision
              Companion, tools, or related services, you agree to these terms. If you don&rsquo;t
              agree, please don&rsquo;t use the service.
            </p>
          </div>

          <div>
            <h2 className="type-h3">2. Educational guidance only</h2>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} provides educational guidance only. It does not provide financial,
              legal, tax, mortgage, real estate, or investment advice. Your HōMI-Score, verdict, and
              any content from the Decision Companion are informational tools meant to help you
              understand your own readiness — they are not recommendations to buy, sell, borrow, or
              invest, and they are not a substitute for advice from a licensed professional.
            </p>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} is not a lender, mortgage broker, registered investment advisor,
              credit bureau, real estate agent or brokerage, financial planner, bank, deposit
              institution, or product recommendation engine. See our{" "}
              <Link href="/legal/disclaimer" className="text-cyan hover:underline">
                Disclaimer
              </Link>{" "}
              for the full statement.
            </p>
          </div>

          <div>
            <h2 className="type-h3">3. Accounts</h2>
            <p className="mt-3 leading-relaxed">
              You&rsquo;re responsible for maintaining the confidentiality of your account
              credentials and for all activity under your account. Provide accurate information when
              creating an account and keep it up to date. We may suspend or terminate accounts that
              violate these terms or misuse the service.
            </p>
          </div>

          <div>
            <h2 className="type-h3">4. Subscriptions and billing</h2>
            <p className="mt-3 leading-relaxed">
              Paid tiers (Plus, Pro, Family) are billed on a recurring basis at the rate displayed
              at the time of purchase. Subscriptions renew automatically until canceled. You can
              cancel anytime from your account settings; cancellation takes effect at the end of the
              current billing period, and we do not provide partial refunds for unused time except
              where required by law.
            </p>
            <p className="mt-3 leading-relaxed">
              We may change pricing going forward. Existing subscribers will be notified of any
              pricing change before it takes effect on their next renewal.
            </p>
          </div>

          <div>
            <h2 className="type-h3">5. Acceptable use</h2>
            <p className="mt-3 leading-relaxed">
              Don&rsquo;t use {BRAND.display} to misrepresent your identity, attempt to
              reverse-engineer the scoring methodology, scrape or resell our content, or interfere
              with the normal operation of the service.
            </p>
          </div>

          <div>
            <h2 className="type-h3">6. Intellectual property</h2>
            <p className="mt-3 leading-relaxed">
              The HōMI name, wordmark, Threshold Compass, Decision Readiness Intelligence™, scoring
              methodology, and related content are the property of {BRAND.legalEntity}. Nothing in
              these terms transfers ownership of that intellectual property to you.
            </p>
          </div>

          <div>
            <h2 className="type-h3">7. Limitation of liability</h2>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} is provided &ldquo;as is&rdquo; without warranties of any kind. To the
              fullest extent permitted by law, {BRAND.legalEntity} is not liable for any indirect,
              incidental, or consequential damages arising from your use of the service, including
              decisions you make based on your HōMI-Score or any content provided through the
              platform. You are solely responsible for your own financial decisions.
            </p>
          </div>

          <div>
            <h2 className="type-h3">8. Termination</h2>
            <p className="mt-3 leading-relaxed">
              You may stop using {BRAND.display} and close your account at any time. We may suspend
              or terminate access to the service for violations of these terms, with notice where
              practical.
            </p>
          </div>

          <div>
            <h2 className="type-h3">9. Changes to these terms</h2>
            <p className="mt-3 leading-relaxed">
              We may update these terms as the product evolves. Continued use of the service after a
              material change constitutes acceptance of the updated terms.
            </p>
          </div>

          <div>
            <h2 className="type-h3">10. Contact</h2>
            <p className="mt-3 leading-relaxed">
              Questions about these terms can be directed to {BRAND.legalEntity} at{" "}
              <a href="mailto:support@homitechnology.com" className="text-cyan hover:underline">
                support@homitechnology.com
              </a>
              . See also our{" "}
              <Link href="/legal/privacy" className="text-cyan hover:underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/legal/disclaimer" className="text-cyan hover:underline">
                Disclaimer
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
