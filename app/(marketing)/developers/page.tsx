import type { Metadata } from "next";
import Link from "next/link";
import { Playground } from "@/components/developers/Playground";
import { ExamplePhone } from "@/components/developers/ExamplePhone";
import { CanonVoices } from "@/components/developers/CanonVoices";
import { pageMetadata } from "@/lib/seo/metadata";
import { LEGAL_DISCLAIMER } from "@/lib/brand";

export const metadata: Metadata = pageMetadata({
  title: "Developers · Preview",
  description:
    "Preview: how agents start a HōMI share session and verify a Decision Readiness receipt. Educational guidance. Not a live /v1/readiness API. EXAMPLE fixtures only.",
  path: "/developers",
});

export default function DevelopersPage() {
  return (
    <div className="field px-6 pb-24 pt-16 md:pt-24">
      <div className="mx-auto max-w-6xl">
        <p className="type-kicker text-cyan">DEVELOPERS · PREVIEW</p>
        <h1 className="mt-4 type-h1">Server scores. Partners verify a receipt.</h1>
        <p className="mt-6 max-w-2xl text-lg text-dim">
          Agents ask whether a person is ready by sending them through HōMI — not by posting someone
          else&rsquo;s finances. Scoring stays on the server. This page shows canned EXAMPLE fixtures
          and the SHIPPED paths. It is not a live POST /v1/readiness endpoint.
        </p>
        <p className="mt-4 text-sm text-dim">
          Never use Decision Readiness for credit, employment, housing, or insurance eligibility.
        </p>

        <section className="mt-16">
          <h2 className="type-h2">Playground · EXAMPLE</h2>
          <p className="mt-3 max-w-2xl text-dim">
            Start with a hosted session. Then verify a Decision Readiness receipt. The EXAMPLE 61 /
            BUILD FIRST fixture is labeled mock theater only — not a live POST /v1/readiness. READY
            ≥80 · ALMOST THERE 65–79 · BUILD FIRST 50–64 · DO NOT PROCEED 0–49.
          </p>
          <div className="mt-8">
            <Playground />
          </div>
        </section>

        <section className="mt-20 grid items-start gap-12 lg:grid-cols-2">
          <div>
            <p className="type-kicker text-yellow">FOR HUMANS · ILLUSTRATIVE</p>
            <h2 className="mt-4 type-h2">Where not yet becomes READY</h2>
            <p className="mt-4 text-dim">
              Many people are not ready yet. That is not rejection — it is the beginning. The HōMI
              app turns hesitation into a timed path. The weeks below are illustrative, not a live
              Path to Ready for this EXAMPLE.
            </p>
            <ol className="mt-8 space-y-6 text-sm text-dim">
              <li>
                <strong className="text-light">Today — Assessment.</strong> See where you stand
                across Financial Reality, Emotional Truth, Perfect Timing.
              </li>
              <li>
                <strong className="text-light">Week 2–4 — Financial build.</strong> Emergency fund,
                debt ratio, savings velocity.
              </li>
              <li>
                <strong className="text-light">Week 5–8 — Emotional calibration.</strong> Stress-test
                the decision. Not therapy.
              </li>
              <li>
                <strong className="text-light">Week 9–12 — Timing lock.</strong> When the score
                crosses 80, the verdict is READY. You still decide.
              </li>
            </ol>
            <p className="mt-8 font-display text-lg italic text-light">
              “Keep going. The habit you are building right now becomes automatic.”
            </p>
            <p className="mt-2 text-xs text-dim">You (Future) · canned Temporal Twin line · EXAMPLE</p>
          </div>
          <ExamplePhone />
        </section>

        <section className="mt-20">
          <CanonVoices />
        </section>

        <p className="mt-16 text-sm text-dim">
          Want early access as a human?{" "}
          <Link href="/waitlist" className="text-cyan">
            Join the waitlist
          </Link>
          . Partner keys are not self-serve on this Preview.
        </p>
        <p className="mt-6 text-xs leading-relaxed text-dim">{LEGAL_DISCLAIMER}</p>
      </div>
    </div>
  );
}
