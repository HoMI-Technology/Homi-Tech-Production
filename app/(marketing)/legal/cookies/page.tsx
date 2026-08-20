import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Cookie Policy",
  description:
    "How HōMI uses essential cookies and optional analytics. No ad tech. You can reject optional analytics anytime.",
  path: "/legal/cookies",
});

export default function CookiesPage() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="type-h1">Cookie Policy</h1>
        <p className="mt-3 text-sm text-dim">Last updated: 20 Aug 2026</p>

        <div className="mt-10 space-y-10 text-dim">
          <div>
            <p className="leading-relaxed">
              This Cookie Policy explains how {BRAND.legalEntity} (&ldquo;{BRAND.display},&rdquo;
              &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) uses cookies and similar
              technologies on {BRAND.domain} (the &ldquo;Sites&rdquo;).
            </p>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} uses essential cookies to keep you signed in. Optional analytics help
              us improve the product — your choice, and you can change it anytime. No ad tech.
            </p>
          </div>

          <div>
            <h2 className="type-h3">What are cookies?</h2>
            <p className="mt-3 leading-relaxed">
              Cookies are small data files placed on your computer or mobile device when you visit
              a website. They can keep you signed in, remember a preference, or help a site
              understand how it is used.
            </p>
            <p className="mt-3 leading-relaxed">
              We use first-party cookies we set, and — only if you accept optional analytics — a
              PostHog script served from PostHog. We do not use advertising cookies, social-login
              cookies, or advertising pixels.
            </p>
          </div>

          <div>
            <h2 className="type-h3">What types of cookies and similar technologies we use</h2>
            <p className="mt-3 leading-relaxed">
              The banner, this page, and the site Content-Security-Policy describe the same set.
              We do not run advertising cookies or social cookies.
            </p>

            <p className="mt-6 font-medium text-light">Essential</p>
            <p className="mt-3 leading-relaxed">
              Necessary for the Service to work. There is no opt-out while you stay signed in.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">Supabase auth session cookie.</span> Set
                when you sign in so you stay signed in between pages. It identifies your session.
                It is not an advertising identifier.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed">
              If you use Connections, Plaid Link loads in a third-party frame from cdn.plaid.com
              so you can connect an account. That is required for that feature, not an advertising
              cookie. See{" "}
              <Link href="/legal/subprocessors" className="text-cyan hover:underline">
                Subprocessors
              </Link>
              .
            </p>

            <p className="mt-6 font-medium text-light">Analytics</p>
            <p className="mt-3 leading-relaxed">
              Optional. Off until you press Accept optional on the cookie banner.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">PostHog.</span> If you accept, we load
                PostHog to understand product usage. Persistence is memory-only — PostHog does not
                set a cookie. Autocapture is off. Session recording is off. Reject optional and
                the product still works. You can change this anytime from the cookie banner.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed">
              We do not run Google Analytics, FullStory, Meta Pixel, or any advertising pixel.
            </p>

            <p className="mt-6 font-medium text-light">Functionality</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">homi_attr</span> — a first-party cookie
                that stores first-touch channel identifiers (ref or UTM values and the landing
                path) for 90 days. It does not store scores or answers. It is not an advertising
                cookie.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="type-h3">Other technologies</h2>
            <p className="mt-3 font-medium text-light">Browser web storage</p>
            <p className="mt-3 leading-relaxed">
              Beyond cookies, {BRAND.display} uses local and session storage for small flags — not
              a guest verdict.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">homi:consent</span> (local storage) — your
                Accept optional or Reject optional choice. This is the gate for PostHog.
              </li>
              <li>
                <span className="font-medium text-light">Homepage session flag</span> — the first
                homepage visit may hold the cookie banner so it does not cover the landing intro.
                That hold is a session flag, not an advertising identifier.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed">
              Notification preferences live on your account, not in a browser cookie. Assessment
              results live on your account after you sign in.
            </p>
            <p className="mt-3 leading-relaxed">
              We do not use Flash cookies, mobile application SDKs, or session-replay products.
            </p>
          </div>

          <div>
            <h2 className="type-h3">Your choices</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <span className="font-medium text-light">Cookie banner.</span> On your first
                visit (and after you clear the stored choice) the banner offers Accept optional
                and Reject optional. Essential cookies do not need that consent. There is no
                separate cookie dashboard.
              </li>
              <li>
                <span className="font-medium text-light">Browser settings.</span> Most browsers
                let you remove or reject cookies. If you block the Supabase session cookie, you
                will be signed out.
              </li>
              <li>
                <span className="font-medium text-light">Clearing storage.</span> Clearing local
                or session storage removes the consent flag and may show the banner again. It does
                not delete account data. See the{" "}
                <Link href="/legal/privacy" className="text-cyan hover:underline">
                  Privacy Policy
                </Link>
                .
              </li>
            </ul>
            <p className="mt-3 leading-relaxed">
              We do not respond to Global Privacy Control or Do Not Track. We do not participate
              in Network Advertising Initiative or Digital Advertising Alliance opt-outs because
              we do not run interest-based advertising.
            </p>
          </div>

          <div>
            <h2 className="type-h3">Changes</h2>
            <p className="mt-3 leading-relaxed">
              If what we store changes, this page will change with it. Material changes will be
              reflected here with an updated date above.
            </p>
          </div>

          <div>
            <h2 className="type-h3">Questions</h2>
            <p className="mt-3 leading-relaxed">
              Email{" "}
              <a href="mailto:hello@homitechnology.com" className="text-cyan hover:underline">
                hello@homitechnology.com
              </a>{" "}
              or{" "}
              <a href="mailto:Info@homitechnology.com" className="text-cyan hover:underline">
                Info@homitechnology.com
              </a>
              . We do not have a telephone number, toll-free line, or fax. See also our{" "}
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
