import type { Metadata } from "next";
import Link from "next/link";
import {
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL,
} from "@/components/marketing/first-moment-copy";
import { Reveal } from "@/components/ui/Reveal";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { PILLARS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How HōMI measures readiness: assess across three pillars, receive an honest verdict, and get the map for what to build first.",
  alternates: { canonical: "/how-it-works" },
};

const SUB_FACTORS: Record<string, { name: string; description: string }[]> = {
  financial: [
    {
      name: "Debt-to-income",
      description:
        "How much of your gross income already goes to debt. Lower ratios mean more room to absorb a mortgage payment without strain.",
    },
    {
      name: "Down payment",
      description:
        "What you've saved toward the purchase relative to the price. More down means smaller loans, smaller payments, and more equity from day one.",
    },
    {
      name: "Emergency fund",
      description:
        "Months of living expenses set aside beyond the purchase itself. Owning something means owning the surprises that come with it.",
    },
    {
      name: "Credit and stability",
      description:
        "Your credit health and the consistency of your financial history. This shapes the rate you'll actually be offered.",
    },
  ],
  emotional: [
    {
      name: "Confidence",
      description:
        "How sure you are about this decision, independent of the numbers. Confidence built on evidence differs from confidence built on hope.",
    },
    {
      name: "Alignment",
      description:
        "Whether you and anyone else involved — a partner, a family — are actually pointed the same direction. Misalignment shows up later if it isn't named now.",
    },
    {
      name: "Pressure",
      description:
        "External pressure — a deadline, a listing, a friend's timeline — pushing you toward a decision faster than your own conviction would.",
    },
    {
      name: "Life stability",
      description:
        "How steady the rest of your life is right now: work, health, relationships. Big decisions land differently depending on what else is in motion.",
    },
  ],
  timing: [
    {
      name: "Horizon",
      description:
        "How far out you're planning to move. A longer runway gives the other two pillars time to catch up.",
    },
    {
      name: "Savings rate",
      description:
        "How much of your income you're currently setting aside. This is the clearest signal of whether the trend is moving toward readiness or away from it.",
    },
    {
      name: "Progress",
      description:
        "How close you are to your own goal, not someone else's. Momentum matters as much as the current total.",
    },
  ],
};

export default function HowItWorksPage() {
  return (
    <>
      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="type-h1">How HōMI works</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">
            Three pillars, not equal. Financial Reality 35. Emotional Truth 35. Perfect Timing 30. How they combine stays ours.
          </p>
        </div>
      </section>

      {/* Three-step walkthrough */}
      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Assess",
                copy: "Answer honest questions across Financial Reality, Emotional Truth, and Perfect Timing. Sliders, not essays.",
              },
              {
                step: "02",
                title: "Verdict",
                copy: "Three pillars, not equal. Financial Reality 35. Emotional Truth 35. Perfect Timing 30. How they combine stays ours. Then hard-stops — conditions that override the math because they are not safe to build on top of.",
              },
              {
                step: "03",
                title: "Build",
                copy: "Not yet is a starting line, not a wall. You get a map: the specific, ordered things to build first.",
              },
            ].map((s) => (
              <div key={s.step} className="glass glass-hover p-8">
                <span className="score-numeral text-sm text-dim">{s.step}</span>
                <h2 className="mt-3 type-h3">{s.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-dim">{s.copy}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Pillar deep dive */}
      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center type-h2">Inside the three pillars</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-dim">
              Three pillars, not equal. Financial Reality 35. Emotional Truth 35. Perfect Timing 30. How they combine stays ours. Here is what each pillar looks at and why it matters.
            </p>

            <div className="mt-14 space-y-10">
              {PILLARS.map((pillar) => (
                <div key={pillar.key} className="glass p-8 md:p-10">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="type-h3">{pillar.name}</h3>
                    <span className="text-lg" style={{ color: pillar.color }}>
                      {pillar.question}
                    </span>
                  </div>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    {SUB_FACTORS[pillar.key].map((factor) => (
                      <div
                        key={factor.name}
                        className="border-l-2 pl-4"
                        style={{ borderColor: `${pillar.color}55` }}
                      >
                        <h4 className="font-semibold text-light">{factor.name}</h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-dim">
                          {factor.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* Hard stops */}
      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <div className="glass p-10 md:p-14">
              <h2 className="type-h2">Red lines that protect you</h2>
              <p className="mt-4 leading-relaxed text-dim">
                Some conditions aren&rsquo;t a matter of degree. When any of these are true, the
                verdict is forced to NOT YET regardless of the numeric score. This is a protection
                signal, not a punishment.
              </p>
              <ul className="mt-8 space-y-5">
                <li className="flex items-start gap-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-crimson" />
                  <div>
                    <p className="font-semibold text-light">Debt-to-income above 50%</p>
                    <p className="mt-1 text-sm text-dim">
                      Almost no margin left to absorb a new payment without strain.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-crimson" />
                  <div>
                    <p className="font-semibold text-light">Housing cost above 45% of income</p>
                    <p className="mt-1 text-sm text-dim">
                      The line where one bad month turns into a crisis.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-crimson" />
                  <div>
                    <p className="font-semibold text-light">Less than one month of runway</p>
                    <p className="mt-1 text-sm text-dim">
                      Owning a home means owning its surprises. You need a cushion first.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-crimson" />
                  <div>
                    <p className="font-semibold text-light">Credit under 620</p>
                    <p className="mt-1 text-sm text-dim">
                      Lenders price this as high-risk. The interest cost alone could undo the
                      purchase.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Verdict tiers */}
      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center type-h2">The verdict tiers</h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="glass flex flex-col items-center gap-3 p-7 text-center">
                <VerdictBadge verdict="READY" />
                <p className="font-score text-sm text-dim">80 – 100</p>
                <p className="text-sm text-dim">
                  All three rings align. Your compass becomes a key.
                </p>
              </div>
              <div className="glass flex flex-col items-center gap-3 p-7 text-center">
                <VerdictBadge verdict="ALMOST_THERE" />
                <p className="font-score text-sm text-dim">65 – 79</p>
                <p className="text-sm text-dim">
                  You&rsquo;ve nearly cooled down. One or two things first.
                </p>
              </div>
              <div className="glass flex flex-col items-center gap-3 p-7 text-center">
                <VerdictBadge verdict="BUILD_FIRST" />
                <p className="font-score text-sm text-dim">50 – 64</p>
                <p className="text-sm text-dim">Build First is not failure. It is the map.</p>
              </div>
              <div className="glass flex flex-col items-center gap-3 p-7 text-center">
                <VerdictBadge verdict="NOT_YET" />
                <p className="font-score text-sm text-dim">Below 50</p>
                <p className="text-sm text-dim">
                  Not yet is not no. It is clarity. It is protection.
                </p>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm leading-relaxed text-dim">
              HōMI Score is not a credit score. Lenders will still pull a credit report. Fannie&apos;s
              manual floor is still 620. That is their gate, not a HōMI verdict.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="type-h1">See where you stand.</h2>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href={PRIMARY_CLOSE_HREF} className="btn btn-primary">
                {PRIMARY_CLOSE_LABEL}
              </Link>
              <Link href="/method" className="btn btn-ghost">
                Read the philosophy
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
