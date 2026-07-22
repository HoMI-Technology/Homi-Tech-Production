import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How HOMI TECHNOLOGIES LLC collects, stores, and protects your data. We do not sell your data — ever.",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-black text-light">Privacy Policy</h1>
        <p className="mt-3 text-sm text-dim">Last updated: July 2026</p>

        <div className="mt-10 space-y-10 text-dim">
          <div>
            <h2 className="text-xl font-bold text-light">1. Who we are</h2>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} is a product of {BRAND.legalEntity} (&ldquo;{BRAND.display}
              ,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). This policy explains what data we
              collect when you use our assessment, Decision Companion, tools, and related
              services, and what we do — and never do — with it.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">2. Data we collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                Account information: name, email address, and authentication details when
                you create an account.
              </li>
              <li>
                Assessment data: the financial, emotional, and timing inputs you provide to
                generate your HōMI-Score, including debt-to-income figures, savings figures,
                credit range, and self-reported readiness sliders.
              </li>
              <li>
                Usage data: pages visited, features used, and device or browser information,
                collected to keep the product working and to understand what&rsquo;s useful.
              </li>
              <li>
                Communications: messages you send us through support, waitlist forms, or
                Decision Companion conversations.
              </li>
              <li>
                Billing data: for paid tiers, payment is processed by a third-party payment
                processor. We do not store full payment card numbers on our own servers.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">3. Where your data lives</h2>
            <p className="mt-3 leading-relaxed">
              Account and assessment data is stored using Supabase, a hosted database and
              authentication provider, with row-level security applied so that your data is
              scoped to your account. We apply reasonable technical and organizational
              safeguards, but no system is perfectly secure, and we encourage you to use a
              strong, unique password.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">4. What we do with your data</h2>
            <p className="mt-3 leading-relaxed">
              We use your data to calculate your HōMI-Score, generate your readiness report
              and transformation plan, power Decision Companion conversations, operate your
              account, and improve the product. We do not use your assessment data to sell
              you a financial product, and we do not share it with lenders, brokers, or
              advisors for marketing purposes.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">5. We do not sell your data</h2>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} does not sell, rent, or trade your personal or financial data
              to third parties for their marketing purposes. Full stop. Any service
              providers we use to operate the product (hosting, database, email delivery,
              payment processing) are bound by contract to use your data only to provide
              that service to us.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">6. Your rights</h2>
            <p className="mt-3 leading-relaxed">
              Depending on where you live, you may have rights under the General Data
              Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), or
              similar laws, including the right to access the data we hold about you, the
              right to request correction or deletion, the right to export your data, and
              the right to object to certain processing. You can exercise these rights by
              contacting us using the information below, or from your account settings where
              available.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">7. Data retention</h2>
            <p className="mt-3 leading-relaxed">
              We retain account and assessment data for as long as your account is active.
              If you delete your account, we will delete or anonymize your personal data
              within a reasonable period, except where we are required to retain records for
              legal or accounting purposes.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">8. Children</h2>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} is not directed to children under 18, and we do not knowingly
              collect data from anyone under that age.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">9. Changes to this policy</h2>
            <p className="mt-3 leading-relaxed">
              We may update this policy as the product evolves. Material changes will be
              reflected on this page with an updated date above.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">10. Contact</h2>
            <p className="mt-3 leading-relaxed">
              Questions about this policy or your data can be sent to {BRAND.legalEntity}{" "}
              through our support channels. See also our{" "}
              <Link href="/legal/terms" className="text-cyan hover:underline">
                Terms of Service
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
