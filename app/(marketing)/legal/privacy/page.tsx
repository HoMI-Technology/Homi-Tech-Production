import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How HOMI TECHNOLOGIES LLC collects, stores, and protects your data. We do not sell your data — ever.",
  path: "/legal/privacy",
});

export default function PrivacyPage() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="type-h1">Privacy Policy</h1>
        <p className="mt-3 text-sm text-dim">Last updated: 20 Aug 2026</p>

        <div className="mt-10 space-y-10 text-dim">
          <div>
            <p className="leading-relaxed">
              {BRAND.legalEntity} (&ldquo;{BRAND.display},&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
              or &ldquo;our&rdquo;) provides Decision Readiness Intelligence at{" "}
              {BRAND.domain}. This Privacy Policy describes how we process personal information
              collected through the website and services that link to this policy (the
              &ldquo;Service&rdquo;).
            </p>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} is educational only. We are not a lender, not a registered investment
              advisor, and not a credit bureau. Your score is not advice. See our{" "}
              <Link href="/legal/disclaimer" className="text-cyan hover:underline">
                Disclaimer
              </Link>
              .
            </p>
            <p className="mt-3 leading-relaxed">
              This is a United States privacy notice. We do not claim GDPR operations, an EEA or UK
              establishment, EU targeting, standard contractual clauses, or a GDPR data-protection
              officer.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">State privacy rights.</span> See the{" "}
              <a href="#state-privacy-rights" className="text-cyan hover:underline">
                State privacy rights notice
              </a>{" "}
              below.
            </p>
          </div>

          <div>
            <h2 className="type-h3">Index</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <a href="#collect" className="text-cyan hover:underline">
                  Personal information we collect
                </a>
              </li>
              <li>
                <a href="#tracking" className="text-cyan hover:underline">
                  Tracking and other technologies
                </a>
              </li>
              <li>
                <a href="#use" className="text-cyan hover:underline">
                  How we use your personal information
                </a>
              </li>
              <li>
                <a href="#retention" className="text-cyan hover:underline">
                  Retention
                </a>
              </li>
              <li>
                <a href="#share" className="text-cyan hover:underline">
                  How we share your personal information
                </a>
              </li>
              <li>
                <a href="#choices" className="text-cyan hover:underline">
                  Your choices
                </a>
              </li>
              <li>
                <a href="#other-sites" className="text-cyan hover:underline">
                  Other sites and services
                </a>
              </li>
              <li>
                <a href="#security" className="text-cyan hover:underline">
                  Security
                </a>
              </li>
              <li>
                <a href="#transfers" className="text-cyan hover:underline">
                  International data transfer
                </a>
              </li>
              <li>
                <a href="#children" className="text-cyan hover:underline">
                  Children
                </a>
              </li>
              <li>
                <a href="#changes" className="text-cyan hover:underline">
                  Changes to this Privacy Policy
                </a>
              </li>
              <li>
                <a href="#contact" className="text-cyan hover:underline">
                  How to contact us
                </a>
              </li>
              <li>
                <a href="#state-privacy-rights" className="text-cyan hover:underline">
                  State privacy rights notice
                </a>
              </li>
            </ul>
          </div>

          <div id="collect">
            <h2 className="type-h3">Personal information we collect</h2>

            <p className="mt-3 font-medium text-light">Information you provide to us</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">Contact data</span> — name and email
                address when you create an account, join the waitlist, or write to us. We do not
                collect a phone number.
              </li>
              <li>
                <span className="font-medium text-light">Account data</span> — the email and
                password or magic-link details you use to sign in, and the name you add to your
                profile.
              </li>
              <li>
                <span className="font-medium text-light">Communications data</span> — messages you
                send through support, waitlist forms, or Decision Companion conversations.
              </li>
              <li>
                <span className="font-medium text-light">Assessment and input data</span> — the
                financial, emotional, and timing inputs you submit so we can compute your
                readiness result. The result is educational. We do not publish how the score is
                computed.
              </li>
              <li>
                <span className="font-medium text-light">Transactional data</span> — subscription
                tier and billing history for paid plans. Payment card numbers are collected by
                Stripe, not stored on our servers.
              </li>
              <li>
                <span className="font-medium text-light">Household invite data</span> — an email
                address you enter when you invite someone to a Family household. Do not share
                someone else&rsquo;s email unless you have permission.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed">
              We do not collect government identification numbers, Social Security numbers,
              passport or driver-license images, photographs, social-network profile links, or
              contest/sweepstakes entries.
            </p>

            <p className="mt-6 font-medium text-light">Third-party sources</p>
            <p className="mt-3 leading-relaxed">
              We may combine information you provide with information from the service providers
              that operate the Service, listed on{" "}
              <Link href="/legal/subprocessors" className="text-cyan hover:underline">
                Subprocessors
              </Link>
              :
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">Plaid</span> — financial account
                connectivity when you choose to connect an account.
              </li>
              <li>
                <span className="font-medium text-light">Stripe</span> — payment processing and
                subscription status.
              </li>
              <li>
                <span className="font-medium text-light">Supabase</span> — authentication and
                hosted database records for your account.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed">
              If a third-party sign-in option is offered and you use it, we receive the name and
              email that provider shares for authentication. That is account sign-in, not
              advertising. We do not buy lists from data brokers, scrape public records, or run
              social-login advertising cookies.
            </p>

            <p className="mt-6 font-medium text-light">Automatic data collection</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">Device and log data</span> — browser and
                device type, IP address, and general location derived from IP, collected by our
                hosting and security stack so the Service can run.
              </li>
              <li>
                <span className="font-medium text-light">Online activity data</span> — pages
                viewed and features used. Optional product analytics (PostHog) load only after you
                accept optional analytics. PostHog is configured with memory persistence, no
                autocapture, and no session recording.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed">
              We do not collect precise geolocation. The Service does not request device location
              access.
            </p>
          </div>

          <div id="tracking">
            <h2 className="type-h3">Tracking and other technologies</h2>
            <p className="mt-3 leading-relaxed">
              Cookies and similar technologies are described in our{" "}
              <Link href="/legal/cookies" className="text-cyan hover:underline">
                Cookie Policy
              </Link>
              . We store your optional-analytics choice in browser local storage.
            </p>
            <p className="mt-3 leading-relaxed">
              Decision Companion replies are generated using Anthropic. Companion messages you
              submit are sent to that provider so a reply can be produced. See{" "}
              <Link href="/legal/subprocessors" className="text-cyan hover:underline">
                Subprocessors
              </Link>
              .
            </p>
          </div>

          <div id="use">
            <h2 className="type-h3">How we use your personal information</h2>
            <p className="mt-3 leading-relaxed">We use personal information to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>provide the Service, including your account, assessment result, and tools;</li>
              <li>keep the Service secure and operate authentication;</li>
              <li>send Service-related messages (security, billing, support);</li>
              <li>send waitlist or transactional email you asked for, from hello@homitechnology.com;</li>
              <li>respond to questions you send us;</li>
              <li>
                understand product usage when you accept optional analytics (PostHog — not Google
                Analytics);
              </li>
              <li>comply with law, prevent abuse, and enforce our terms; and</li>
              <li>
                create aggregated or de-identified information that cannot reasonably identify you,
                to improve the Service.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed">
              We do not use your assessment data to sell you a financial product. We do not share
              it with lenders, brokers, or advisors for their marketing. We do not run
              interest-based advertising, ad cookies, or advertising pixels.
            </p>
          </div>

          <div id="retention">
            <h2 className="type-h3">Retention</h2>
            <p className="mt-3 leading-relaxed">
              We keep account and assessment data while your account is active. If you delete your
              account, we delete or anonymize personal data within a reasonable period, except
              where law or accounting rules require a record. Waitlist emails are kept until you
              unsubscribe or ask us to delete them.
            </p>
          </div>

          <div id="share">
            <h2 className="type-h3">How we share your personal information</h2>
            <p className="mt-3 leading-relaxed">
              We share personal information with the following parties, and as described in this
              policy or at the time of collection.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">Service providers.</span> Vercel
                (hosting), Supabase (database and authentication), Plaid (account connectivity),
                Stripe (payments), PostHog (optional analytics), Sentry (server-side error
                tracking), Resend (email), and Anthropic (Decision Companion). The live list is{" "}
                <Link href="/legal/subprocessors" className="text-cyan hover:underline">
                  Subprocessors
                </Link>
                . We do not use MX, SnapTrade, Meta Pixel, ad tech, Google Analytics, or FullStory.
              </li>
              <li>
                <span className="font-medium text-light">Payment processors.</span> Stripe
                collects and processes payment card data under its own privacy policy. Checkout is
                a full-page redirect; we do not load Stripe.js on our pages.
              </li>
              <li>
                <span className="font-medium text-light">Third parties you designate.</span> If
                you connect a financial account, Plaid receives what that connection requires.
              </li>
              <li>
                <span className="font-medium text-light">Professional advisors.</span> Lawyers,
                auditors, or similar advisors when they need it to advise us.
              </li>
              <li>
                <span className="font-medium text-light">Authorities and others.</span> Law
                enforcement or other parties when we believe in good faith it is required to
                comply with law or protect rights, safety, or the Service.
              </li>
              <li>
                <span className="font-medium text-light">Business transferees.</span> In a merger,
                financing, or sale of assets, personal information may transfer as part of that
                transaction, subject to this policy.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed">
              We do not have advertising partners. We do not sell personal information. We do not
              share personal information for targeted advertising. Assessment results are not a
              public profile.
            </p>
          </div>

          <div id="choices">
            <h2 className="type-h3">Your choices</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">Access or update.</span> Signed-in users
                can review account information in account settings.
              </li>
              <li>
                <span className="font-medium text-light">Email.</span> Transactional and
                security messages still need to reach you. Waitlist and other optional mail
                include unsubscribe instructions.
              </li>
              <li>
                <span className="font-medium text-light">Cookies and analytics.</span> Use the
                cookie banner to accept or reject optional analytics. Details are in the{" "}
                <Link href="/legal/cookies" className="text-cyan hover:underline">
                  Cookie Policy
                </Link>
                .
              </li>
              <li>
                <span className="font-medium text-light">Global Privacy Control and Do Not
                Track.</span>{" "}
                The cookie banner does not read Global Privacy Control (GPC) or Do Not Track
                signals. Optional analytics stay off until you press Accept optional.
              </li>
              <li>
                <span className="font-medium text-light">Declining to provide information.</span>{" "}
                Some features need an account, an assessment, or a connected account. If you do
                not provide what that feature needs, that feature will not work.
              </li>
              <li>
                <span className="font-medium text-light">Close your account.</span> You can close
                your account from account settings where available, or by emailing us using the
                contacts below.
              </li>
            </ul>
          </div>

          <div id="other-sites">
            <h2 className="type-h3">Other sites and services</h2>
            <p className="mt-3 leading-relaxed">
              The Service links to third-party sites and may send you through Plaid or Stripe
              hosted flows. Those services are not us. Their privacy policies govern their
              collection. We do not control them and are not responsible for them.
            </p>
          </div>

          <div id="security">
            <h2 className="type-h3">Security</h2>
            <p className="mt-3 leading-relaxed">
              We use technical and organizational safeguards designed to protect personal
              information, including row-level security on application data stored in Supabase.
              No internet service is perfectly secure. Use a strong, unique password. Report
              security issues to{" "}
              <a href="mailto:security@homitechnology.com" className="text-cyan hover:underline">
                security@homitechnology.com
              </a>
              .
            </p>
          </div>

          <div id="transfers">
            <h2 className="type-h3">International data transfer</h2>
            <p className="mt-3 leading-relaxed">
              We are a United States company based in Palm Springs, Florida. Some subprocessors
              operate servers in other countries. If you use the Service from outside the United
              States, your information is processed in the United States and in those vendor
              locations. We do not operate a GDPR transfer program and do not offer standard
              contractual clauses.
            </p>
          </div>

          <div id="children">
            <h2 className="type-h3">Children</h2>
            <p className="mt-3 leading-relaxed">
              The Service is not intended for anyone under 18. We do not knowingly collect
              personal information from children under 18. If you believe we have, contact us and
              we will delete it as required by law.
            </p>
          </div>

          <div id="changes">
            <h2 className="type-h3">Changes to this Privacy Policy</h2>
            <p className="mt-3 leading-relaxed">
              We may update this policy. Material changes will be posted here with a new date at
              the top of this page.
            </p>
          </div>

          <div id="contact">
            <h2 className="type-h3">How to contact us</h2>
            <p className="mt-3 leading-relaxed">
              Questions about this policy or your data:
            </p>
            <p className="mt-3 leading-relaxed">
              {BRAND.legalEntity}
              <br />
              3072 Floweva St
              <br />
              Palm Springs, FL 33406
            </p>
            <p className="mt-3 leading-relaxed">
              Email:{" "}
              <a href="mailto:hello@homitechnology.com" className="text-cyan hover:underline">
                hello@homitechnology.com
              </a>
              {", "}
              <a href="mailto:Info@homitechnology.com" className="text-cyan hover:underline">
                Info@homitechnology.com
              </a>
              {", or "}
              <a href="mailto:security@homitechnology.com" className="text-cyan hover:underline">
                security@homitechnology.com
              </a>
              .
            </p>
            <p className="mt-3 leading-relaxed">
              We do not have a telephone number, toll-free line, or fax.
            </p>
            <p className="mt-3 leading-relaxed">
              See also our{" "}
              <Link href="/legal/terms" className="text-cyan hover:underline">
                Terms of Service
              </Link>
              ,{" "}
              <Link href="/legal/cookies" className="text-cyan hover:underline">
                Cookie Policy
              </Link>
              ,{" "}
              <Link href="/legal/disclaimer" className="text-cyan hover:underline">
                Disclaimer
              </Link>
              , and{" "}
              <Link href="/legal/subprocessors" className="text-cyan hover:underline">
                Subprocessors
              </Link>
              .
            </p>
          </div>

          <div id="state-privacy-rights">
            <h2 className="type-h3">State privacy rights notice</h2>
            <p className="mt-3 leading-relaxed">
              Some U.S. state laws give residents rights to know, access, correct, delete, or
              appeal certain personal-information practices. Those rights are not absolute. We
              may need enough detail to confirm it is you before we act. We do not run a
              toll-free request line or a separate webform; email or write us using the contacts
              above.
            </p>
            <p className="mt-3 leading-relaxed">
              We do not sell personal information. We do not share personal information for
              targeted advertising. We do not process personal information for interest-based
              advertising. We do not use personal information for automated decisions that
              approve credit, housing, employment, or other legal or similarly significant
              effects — the score is educational and is not advice.
            </p>
            <p className="mt-3 leading-relaxed">
              Assessment inputs can include financial information. We do not use that information
              to infer characteristics for advertising.
            </p>
            <p className="mt-3 leading-relaxed">
              We do not honor Global Privacy Control as an opt-out signal. Optional analytics
              are off until you accept them on the cookie banner.
            </p>
            <p className="mt-3 leading-relaxed">
              Authorized agents may email us with proof they may act for you. We do not
              discriminate for exercising privacy rights.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Shine the Light.</span> We do not disclose
              personal information to third parties for their own direct marketing. There is no
              list to send.
            </p>
            <p className="mt-3 leading-relaxed">
              <span className="font-medium text-light">Nevada.</span> We do not sell covered
              information as Nevada defines that sale. You may still email us to record an
              opt-out request.
            </p>
            <p className="mt-3 leading-relaxed">
              Categories we collect, the purposes above, and the subprocessors we disclose to for
              a business purpose are the practices in effect now and during the twelve months
              before the date on this page. We do not sell or share those categories for targeted
              advertising.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
