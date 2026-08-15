import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How HōMI uses essential cookies and optional analytics. No ad tech. You can reject optional analytics anytime.",
  alternates: { canonical: "/legal/cookies" },
};

export default function CookiesPage() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="type-h1">Cookie Policy</h1>
        <p className="mt-3 text-sm text-dim">Last updated: August 2026</p>

        <div className="mt-10 space-y-10 text-dim">
          <div>
            <h2 className="type-h3">1. The short version</h2>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} uses one essential cookie to keep you signed in. Optional analytics
              (PostHog) help us improve the product. That choice is yours — reject or accept
              anytime. No ad tech. Nothing here is sold or shared for marketing.
            </p>
          </div>

          <div>
            <h2 className="type-h3">2. The essential cookie</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">Supabase auth session cookie.</span> Set
                when you sign in, so you stay signed in as you move between pages. It identifies
                your session, not you as an advertising target, and it is required for the product
                to function — there is no way to opt out of it while remaining signed in.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="type-h3">3. Optional analytics</h2>
            <p className="mt-3 leading-relaxed">
              If you accept optional analytics, {BRAND.display} loads PostHog to understand how the
              product is used. You can reject optional analytics and the product still works. You
              can change this anytime from the cookie banner.
            </p>
            <p className="mt-3 leading-relaxed">
              We do not run advertising cookies, ad-network tags, cross-site pixels, or Meta Pixel.
              We do not build advertising profiles from your activity on {BRAND.display}.
            </p>
            <p className="mt-3 leading-relaxed">
              See also{" "}
              <Link href="/legal/subprocessors" className="text-cyan hover:underline">
                Subprocessors
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="type-h3">4. What lives in your browser storage</h2>
            <p className="mt-3 leading-relaxed">
              Beyond cookies, {BRAND.display} uses your browser&rsquo;s local and session storage
              for small flags — not a guest verdict.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">Cookie and notification preferences</span>{" "}
                — your choice on this banner, and your notification toggle in Settings.
              </li>
              <li>
                <span className="font-medium text-light">Hero and onboarding signals</span> — small
                flags (like whether you&rsquo;ve seen the landing-page intro) so the site
                doesn&rsquo;t repeat itself on every visit.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed">
              Assessment results live on your account after you sign in. Guest /results and /plan
              are not a product path. /shadow-score is a read, not a score we store in your browser
              as the product.
            </p>
          </div>

          <div>
            <h2 className="type-h3">5. Managing or clearing this data</h2>
            <p className="mt-3 leading-relaxed">
              You can reject optional analytics from the cookie banner without clearing anything
              else. You can clear local and session storage from your browser&rsquo;s settings,
              which removes those flags and your stored choice — the banner may ask again. Clearing
              the Supabase session cookie will sign you out. Neither action deletes data already
              saved to your account — see our{" "}
              <Link href="/legal/privacy" className="text-cyan hover:underline">
                Privacy Policy
              </Link>{" "}
              for account data export and deletion.
            </p>
          </div>

          <div>
            <h2 className="type-h3">6. Changes to this policy</h2>
            <p className="mt-3 leading-relaxed">
              If what we store changes, this page will change with it. Material changes will be
              reflected here with an updated date above.
            </p>
          </div>

          <div>
            <h2 className="type-h3">7. Contact</h2>
            <p className="mt-3 leading-relaxed">
              Questions about this policy can be sent to {BRAND.legalEntity} through our support
              channels. See also our{" "}
              <Link href="/legal/privacy" className="text-cyan hover:underline">
                Privacy Policy
              </Link>
              ,{" "}
              <Link href="/legal/terms" className="text-cyan hover:underline">
                Terms of Service
              </Link>
              , and{" "}
              <Link href="/legal/subprocessors" className="text-cyan hover:underline">
                Subprocessors
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
