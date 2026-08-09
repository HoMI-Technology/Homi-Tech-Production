import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How HōMI uses cookies and browser storage — essential only, zero trackers, zero ad tech.",
  alternates: { canonical: "/legal/cookies" },
};

export default function CookiesPage() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="type-h1">Cookie Policy</h1>
        <p className="mt-3 text-sm text-dim">Last updated: July 2026</p>

        <div className="mt-10 space-y-10 text-dim">
          <div>
            <h2 className="type-h3">1. The short version</h2>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} uses one essential cookie to keep you signed in. That is the whole
              list. We do not use advertising cookies, analytics trackers, cross-site pixels, or any
              third-party ad-tech. Nothing here is sold or shared for marketing purposes.
            </p>
          </div>

          <div>
            <h2 className="type-h3">2. The one cookie we set</h2>
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
            <h2 className="type-h3">3. Zero trackers, zero ad tech</h2>
            <p className="mt-3 leading-relaxed">
              We do not run Google Analytics, Meta Pixel, ad-network tags, cross-site tracking
              scripts, or any fingerprinting technology. We do not build advertising profiles from
              your activity on {BRAND.display}, and we never will.
            </p>
          </div>

          <div>
            <h2 className="type-h3">4. What lives in your browser storage</h2>
            <p className="mt-3 leading-relaxed">
              Beyond that one cookie, {BRAND.display} uses your browser&rsquo;s local and session
              storage — not cookies — to keep the product fast and to let anonymous visitors use it
              before creating an account. None of this is sent to our servers or to any third party;
              it stays on your device unless you choose to sign in and sync it.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">Assessment drafts and results</span> — your
                most recent Shadow Score or full-assessment result, saved locally so /results and
                /plan work without an account.
              </li>
              <li>
                <span className="font-medium text-light">Hero and onboarding signals</span> — small
                flags (like whether you&rsquo;ve seen the landing-page intro) so the site
                doesn&rsquo;t repeat itself on every visit.
              </li>
              <li>
                <span className="font-medium text-light">Cookie and notification preferences</span>{" "}
                — your choice on this banner, and your notification toggle in Settings.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="type-h3">5. Managing or clearing this data</h2>
            <p className="mt-3 leading-relaxed">
              You can clear local and session storage at any time from your browser&rsquo;s
              settings, which will remove any locally saved assessment drafts. Clearing the Supabase
              session cookie will sign you out. Neither action deletes data already saved to your
              account — see our{" "}
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
              </Link>{" "}
              and{" "}
              <Link href="/legal/terms" className="text-cyan hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
