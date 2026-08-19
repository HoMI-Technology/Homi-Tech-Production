import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "The Method",
  description:
    "The philosophy behind HōMI: readiness before action, the temperature metaphor, and why emotional truth counts as much as financial reality.",
  path: "/method",
});

export default function MethodPage() {
  return (
    <>
      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="type-h1">The method</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">
            Every financial system optimizes outcomes after decisions. HōMI optimizes the moment
            before.
          </p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-dim">
            <h2 className="type-h2">Readiness before action</h2>
            <p>
              We imagine a world where readiness precedes action. Decisions are timed with clarity,
              not pressure. Almost every financial product in existence is built to help you after
              you&rsquo;ve already decided — a better rate, a faster close, a bigger loan. Nothing
              sits in the moment before, asking whether the decision itself is the right one, right
              now.
            </p>
            <p>
              That moment before is where the real cost of a major decision gets set. Most people
              don&rsquo;t regret what they bought. They regret when they bought it. HōMI is built
              entirely around that distinction.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-dim">
            <h2 className="type-h2">The temperature metaphor</h2>
            <p>
              HōMI doesn&rsquo;t score readiness like a test. It measures it like a temperature.
              Cool means clear — the math holds, the timing fits, the desire is genuinely yours.
              Warm means close, with a specific gap or two still open. Hot means stop — moving now
              would put you somewhere you can&rsquo;t easily get back from.
            </p>
            <p>
              &ldquo;You&rsquo;re running hot &mdash; don&rsquo;t move yet.&rdquo;
              &ldquo;You&rsquo;ve cooled down enough. You&rsquo;re there.&rdquo; &ldquo;Still a
              little warm. Build first.&rdquo; The metaphor exists because readiness isn&rsquo;t
              binary in the way approval is. It moves. It can be built. Temperature gives you
              language for a state that changes, instead of a grade that shames.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-dim">
            <h2 className="type-h2">Why emotional truth counts as much as the math</h2>
            <p>
              Financial Reality and Emotional Truth are weighted equally in the HōMI-Score. That is
              deliberate, not sentimental. Your gut is part of the math here. A buyer with perfect
              numbers and a partner who isn&rsquo;t aligned, or a buyer being rushed by a deadline
              that isn&rsquo;t theirs, is not actually ready — no matter what the spreadsheet says.
            </p>
            <p>
              Most systems treat the emotional side of a decision as noise to be filtered out. HōMI
              treats it as signal. Confidence, alignment, pressure, and stability predict regret as
              reliably as debt-to-income ratios do. We built a tool that measures it with the same
              rigor.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-dim">
            <h2 className="type-h2">The moment before everything changes</h2>
            <p>
              The most valuable financial technology of the next decade won&rsquo;t help you manage
              money. It will help you understand when you&rsquo;re ready to make decisions about
              money. That is the thesis HōMI is built on.
            </p>
            <p>
              Credit scores measure if lenders should trust you. Decision Readiness Intelligence™
              measures if you should trust yourself. We&rsquo;re not replacing FICO. We&rsquo;re the
              layer before it — the one that asks whether this is the right decision at all, before
              anyone asks whether you qualify for it.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="glass p-8">
              <h3 className="type-kicker text-dim">Mission</h3>
              <p className="mt-4 font-display text-xl leading-snug text-light">
                &ldquo;We imagine a world where readiness precedes action. Decisions are timed with
                clarity, not pressure.&rdquo;
              </p>
            </div>
            <div className="glass p-8">
              <h3 className="type-kicker text-dim">Vision</h3>
              <p className="mt-4 font-display text-xl leading-snug text-light">
                &ldquo;HōMI is building a decision-readiness operating system for major life and
                financial commitments.&rdquo;
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="type-h1">See the method in practice.</h2>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/how-it-works" className="btn btn-primary">
                How it works
              </Link>
              <Link href="/about" className="btn btn-ghost">
                About HōMI
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
