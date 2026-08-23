import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms governing your use of HōMI, including our educational-only guidance, accounts, subscriptions, and liability limitations.",
  path: "/legal/terms",
});

export default function TermsPage() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="type-h1">Terms of Service</h1>
        <p className="mt-3 text-sm text-dim">Last updated: 20 Aug 2026</p>

        <div className="mt-10 space-y-10 text-dim">
          <div>
            <p className="leading-relaxed">
              The website located at {BRAND.domain} (the &ldquo;Site&rdquo;) is owned and operated
              by {BRAND.legalEntity} (&ldquo;{BRAND.display},&rdquo; &ldquo;Company,&rdquo;
              &ldquo;us,&rdquo; &ldquo;our,&rdquo; or &ldquo;we&rdquo;). Additional rules posted
              on the Site are incorporated into these Terms, including the{" "}
              <Link href="/legal/privacy" className="text-cyan hover:underline">
                Privacy Policy
              </Link>
              ,{" "}
              <Link href="/legal/cookies" className="text-cyan hover:underline">
                Cookie Policy
              </Link>
              ,{" "}
              <Link href="/legal/disclaimer" className="text-cyan hover:underline">
                Disclaimer
              </Link>
              ,{" "}
              <Link href="/legal/acceptable-use" className="text-cyan hover:underline">
                Acceptable Use Policy
              </Link>
              ,{" "}
              <Link href="/legal/dmca" className="text-cyan hover:underline">
                DMCA Policy
              </Link>
              , and{" "}
              <Link href="/legal/subprocessors" className="text-cyan hover:underline">
                Subprocessors
              </Link>
              .
            </p>
            <p className="mt-3 leading-relaxed">
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the Site and the
              Service. By accessing or using the Site, or by creating an account, you agree to
              these Terms. You must be at least 18 years old. If you do not agree, do not use the
              Site.
            </p>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} is Decision Readiness Intelligence. It is educational only. It is
              not a lender, not a registered investment advisor, and not a credit bureau. The
              score is not advice. See the{" "}
              <Link href="/legal/disclaimer" className="text-cyan hover:underline">
                Disclaimer
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="type-h3">1. Accounts</h2>
            <p className="mt-3 leading-relaxed">
              Some features require an account. You agree to provide accurate information and keep
              it current. You can close your account from account settings where available, or by
              emailing us. We may suspend or terminate an account as described in Section 8.
            </p>
            <p className="mt-3 leading-relaxed">
              You are responsible for keeping your login credentials confidential and for activity
              under your account. If you believe your account was accessed without authorization,
              notify us immediately at{" "}
              <a href="mailto:security@homitechnology.com" className="text-cyan hover:underline">
                security@homitechnology.com
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="type-h3">2. Access to the Site</h2>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">License.</span> Subject to these Terms, we
              grant you a limited, non-exclusive, non-transferable, revocable license to access
              and use the Site for your own personal, non-commercial purposes.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Restrictions.</span> You may not license,
              sell, rent, or commercially exploit the Site; modify or reverse-engineer any part of
              it; access it to build a competing product; or scrape or republish our content except
              as these Terms allow. Do not misrepresent your identity or interfere with the
              Service. The{" "}
              <Link href="/legal/acceptable-use" className="text-cyan hover:underline">
                Acceptable Use Policy
              </Link>{" "}
              applies.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Changes.</span> We may modify, suspend, or
              discontinue the Site at any time. We are not liable to you for that change.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Ownership.</span> The HōMI name, wordmark,
              Threshold Compass, Decision Readiness Intelligence™, and related content are the
              property of {BRAND.legalEntity} or its licensors. These Terms do not transfer
              ownership to you.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Feedback.</span> If you send feedback, you
              grant us a perpetual, irrevocable, worldwide, royalty-free license to use it without
              attribution.
            </p>
          </div>

          <div>
            <h2 className="type-h3">3. Privacy</h2>
            <p className="mt-3 leading-relaxed">
              Your use of the Site is also governed by our{" "}
              <Link href="/legal/privacy" className="text-cyan hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms. If these Terms and the Privacy Policy
              conflict on collection or use of personal data, the Privacy Policy controls on that
              point.
            </p>
            <p className="mt-3 leading-relaxed">
              Cookies and similar technologies are described in the{" "}
              <Link href="/legal/cookies" className="text-cyan hover:underline">
                Cookie Policy
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="type-h3">4. Educational guidance only</h2>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} provides educational guidance only. It does not provide financial,
              legal, tax, mortgage, real estate, or investment advice. Your score, verdict, and
              any Decision Companion content are informational. They are not recommendations to
              buy, sell, borrow, or invest, and they are not a substitute for a licensed
              professional.
            </p>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} is not a lender, mortgage broker, registered investment advisor,
              credit bureau, real estate agent or brokerage, financial planner, bank, deposit
              institution, or product recommendation engine.
            </p>
          </div>

          <div>
            <h2 className="type-h3">5. Subscriptions and billing</h2>
            <p className="mt-3 leading-relaxed">
              Paid tiers (Plus, Pro, Family) are billed on a recurring basis at the rate shown at
              purchase. Subscriptions renew until canceled. You can cancel from account settings;
              cancellation takes effect at the end of the current billing period. We do not
              provide partial refunds for unused time except where law requires it.
            </p>
            <p className="mt-3 leading-relaxed">
              We may change pricing going forward. Existing subscribers will be notified of a
              pricing change before it applies to their next renewal. Payments are processed by
              Stripe.
            </p>
          </div>

          <div>
            <h2 className="type-h3">6. Indemnification</h2>
            <p className="mt-3 leading-relaxed">
              You agree to defend, indemnify, and hold harmless {BRAND.legalEntity} and its
              officers, employees, and agents from claims and reasonable costs arising out of your
              use of the Site, your violation of these Terms, or your violation of law. We may
              assume control of the defense of any such claim, and you agree to cooperate. You
              will not settle a claim without our prior written consent.
            </p>
          </div>

          <div>
            <h2 className="type-h3">7. Third-party services and other users</h2>
            <p className="mt-3 leading-relaxed">
              The Site may link to or integrate third-party services, including Plaid, Stripe, and
              the subprocessors listed on{" "}
              <Link href="/legal/subprocessors" className="text-cyan hover:underline">
                Subprocessors
              </Link>
              . We do not control those services. We do not display third-party advertisements.
              Their terms and privacy practices apply to your use of them.
            </p>
            <p className="mt-3 leading-relaxed">
              If you use Family or household features, your interactions with those other users
              are between you and them. We are not responsible for those interactions.
            </p>
          </div>

          <div>
            <h2 className="type-h3">8. Disclaimers</h2>
            <p className="mt-3 leading-relaxed">
              THE SITE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE.&rdquo; TO THE
              FULLEST EXTENT PERMITTED BY LAW, {BRAND.legalEntity} DISCLAIMS ALL WARRANTIES,
              EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SITE WILL BE UNINTERRUPTED,
              ERROR-FREE, OR SECURE.
            </p>
          </div>

          <div>
            <h2 className="type-h3">9. Limitation of liability</h2>
            <p className="mt-3 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {BRAND.legalEntity} IS NOT LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST
              PROFITS OR LOST DATA, ARISING FROM THESE TERMS OR YOUR USE OF THE SITE, INCLUDING
              DECISIONS YOU MAKE BASED ON YOUR SCORE OR ANY CONTENT ON THE PLATFORM. YOU ARE
              SOLELY RESPONSIBLE FOR YOUR OWN FINANCIAL DECISIONS.
            </p>
          </div>

          <div>
            <h2 className="type-h3">10. Term and termination</h2>
            <p className="mt-3 leading-relaxed">
              These Terms remain in effect while you use the Site. You may stop using{" "}
              {BRAND.display} and close your account at any time. We may suspend or terminate
              access if we believe you have violated these Terms, with notice where practical. We
              are not liable to you for termination. Sections that by their nature should survive
              (including 2, 3, 4, 6, 8, 9, 11, and 12) survive termination.
            </p>
          </div>

          <div>
            <h2 className="type-h3">11. State-specific legal notices</h2>
            <p className="mt-3 leading-relaxed">
              Residents of U.S. states with consumer privacy laws may have additional rights
              described in the{" "}
              <Link href="/legal/privacy" className="text-cyan hover:underline">
                Privacy Policy
              </Link>
              . We do not sell personal information and do not share it for targeted advertising.
            </p>
            <p className="mt-3 leading-relaxed">
              If you are a California resident and want to file a complaint about the Site, email{" "}
              <a href="mailto:hello@homitechnology.com" className="text-cyan hover:underline">
                hello@homitechnology.com
              </a>{" "}
              or write to {BRAND.legalEntity}, 651 N Broad St, Suite 201, Middletown, DE 19709. We do
              not have a telephone number.
            </p>
          </div>

          <div>
            <h2 className="type-h3">12. General</h2>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Changes to Terms.</span> We may update
              these Terms. Material changes will be posted on this page with a new date. Continued
              use after a material change means you accept the updated Terms.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Governing law and venue.</span> These
              Terms and any dispute arising out of them or the Site are governed by the laws of
              the State of Florida, without regard to conflict-of-law principles. You and{" "}
              {BRAND.legalEntity} consent to the exclusive jurisdiction and venue of the state and
              federal courts located in Florida. Either party may still seek injunctive relief to
              protect intellectual property, or bring an individual action in small-claims court
              for claims within that court&rsquo;s limits. We do not require arbitration.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Export.</span> You agree not to export or
              transfer technical data from the Site in violation of U.S. export-control law.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Electronic communications.</span> By using
              the Site, you consent to receive notices electronically, by email or by posting on
              the Site.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Entire agreement.</span> These Terms,
              together with the policies linked above, are the entire agreement between you and{" "}
              {BRAND.legalEntity} about the Site. If a provision is unenforceable, it will be
              modified only as needed to be valid, and the rest remains in effect. Our failure to
              enforce a provision is not a waiver. You may not assign these Terms without our
              consent; we may assign them.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Copyright / trademark.</span> Copyright ©
              2026 {BRAND.legalEntity}. All rights reserved. You may not use our trademarks
              without prior written consent.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Contact.</span> {BRAND.legalEntity}, 651 N
              Broad St, Suite 201, Middletown, DE 19709. Email{" "}
              <a href="mailto:hello@homitechnology.com" className="text-cyan hover:underline">
                hello@homitechnology.com
              </a>{" "}
              or{" "}
              <a href="mailto:Info@homitechnology.com" className="text-cyan hover:underline">
                Info@homitechnology.com
              </a>
              . No telephone, toll-free, or fax number exists.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
