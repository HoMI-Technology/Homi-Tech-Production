import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { BRAND } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "About HōMI",
  description:
    "HōMI is a product of Homi Technologies LLC — a Decision Companion designed without transaction pressure. Here's what we are, and what we are not.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="type-h1">About HōMI</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">
            A Decision Companion. Built to help you examine one question: will you be okay?
          </p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-dim">
            <h2 className="type-h2">Our mission</h2>
            <p>
              We imagine a world where readiness precedes action. Decisions are timed with clarity,
              not pressure. HōMI is{" "}
              <Link href="/decision-readiness-intelligence" className="text-light underline decoration-dim/40 underline-offset-4 hover:text-cyan">
                Decision Readiness Intelligence™
              </Link>{" "}
              &mdash; a decision companion
              that helps you evaluate your readiness for life&rsquo;s biggest decisions, starting
              with home buying.
            </p>
            <p>
              HōMI asks three questions most tools never ask at all: Can you afford it? (Financial
              Reality) Do you really want it? (Emotional Truth) Is now the right moment? (Perfect
              Timing) When all three align, your compass becomes a key. That&rsquo;s when
              you&rsquo;re ready.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="glass p-10 md:p-14">
              <h2 className="type-h2">We&rsquo;re Not Competing — We&rsquo;re Creating</h2>
              <p className="mt-5 leading-relaxed text-dim">
                We&rsquo;re not competing with budget apps or financial advisors. We&rsquo;re
                creating a new category that sits upstream of every major financial transaction.
                Most of the industry is paid when a transaction closes. HōMI is paid by
                subscription, so what we earn does not depend on what you decide. That gap is why
                HōMI exists.
              </p>
              <p className="mt-5 leading-relaxed text-dim">
                We&rsquo;re not optimizing for volume. We&rsquo;re optimizing for trust density.
                We&rsquo;re not adding friction for friction&rsquo;s sake. We&rsquo;re restoring
                signal in a system flooded with noise.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="type-h2">A note from the founder</h2>
            <div className="glass mt-6 p-10 md:p-14">
              <p className="font-display text-xl leading-relaxed text-light">
                &ldquo;I built HōMI because I&rsquo;ve seen what happens when people mistake
                momentum for readiness. You can&rsquo;t rush alignment. The spine either heals or it
                doesn&rsquo;t. Forcing it breaks you worse.
              </p>
              <p className="mt-5 font-display text-xl leading-relaxed text-light">
                That&rsquo;s what HōMI does for decisions. We help you find your threshold &mdash;
                the moment when all three rings align and you&rsquo;re actually ready. Not just
                able. Ready.&rdquo;
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center type-h2">What HōMI is not</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-dim">
              We say this plainly because clarity about what we are not is part of being radically
              honest about what we are.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                "A lender or mortgage broker",
                "A registered investment advisor (RIA)",
                "A credit bureau",
                "A real estate agent or brokerage",
                "A financial planner",
                "A bank or deposit institution",
              ].map((item) => (
                <div key={item} className="glass flex items-center gap-3 p-5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-crimson" />
                  <span className="text-sm text-light">{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm leading-relaxed text-dim">
              {BRAND.display} provides educational guidance only and does not provide financial,
              legal, tax, mortgage, real estate, or investment advice.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="glass p-8">
              <h2 className="type-kicker text-dim">Legal entity</h2>
              <p className="mt-3 text-light">{BRAND.legalEntity}</p>
              <p className="mt-2 text-sm leading-relaxed text-dim">
                {BRAND.display} is a product of {BRAND.legalEntity}. See our{" "}
                <Link href="/legal/disclaimer" className="text-cyan hover:underline">
                  full disclaimer
                </Link>
                ,{" "}
                <Link href="/legal/privacy" className="text-cyan hover:underline">
                  privacy policy
                </Link>
                , and{" "}
                <Link href="/legal/terms" className="text-cyan hover:underline">
                  terms of service
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="type-h1">Read the philosophy behind the product.</h2>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/method" className="btn btn-primary">
                The method
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
