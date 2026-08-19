import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import type { HardStopCode } from "@/lib/scoring/public";

import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Hard Stops — When to Wait",
  description:
    "Four conditions that pause any readiness score. Learn what they mean and how to clear them.",
  path: "/guides/hard-stops",
});

/**
 * Public explainer for the four red-line guards.
 *
 * Keyed by HardStopCode (type-only import — the engine never reaches the
 * browser) so this page cannot drift into a fifth stop or rename one. The
 * threshold values are canon and frozen: see AGENTS.md §Product guardrails.
 * This page explains them; it does not compute anything.
 */
const HARD_STOPS: {
  code: HardStopCode;
  title: string;
  threshold: string;
  why: string;
  clear: string[];
}[] = [
  {
    code: "DTI_OVER_50",
    title: "Debt above half your income",
    threshold: "Debt-to-income over 50% of gross income",
    why: "Every dollar already promised to a lender is a dollar that cannot absorb a surprise. Past half your gross income, a single missed paycheck stops being inconvenient and starts being structural — and a mortgage payment lands on top of it, not instead of it.",
    clear: [
      "List every monthly debt payment and divide the total by your gross monthly income — that ratio is the number being measured.",
      "Retire the smallest balances first if you need the monthly relief fastest; retire the highest rates first if you want to pay the least overall.",
      "Raising income moves this as surely as lowering debt does, and often faster.",
      "Re-check once the ratio is under 50%. The pause lifts on its own.",
    ],
  },
  {
    code: "RUNWAY_UNDER_1_MONTH",
    title: "Less than one month of runway",
    threshold: "Emergency reserve under 1 month of expenses",
    why: "Owning means owning the surprises — the water heater, the roof, the month the hours get cut. Without a month of expenses set aside, the first ordinary emergency becomes debt at the worst possible rate.",
    clear: [
      "Work out one month of essential expenses: housing, food, transport, insurance, minimum debt payments.",
      "Hold that amount somewhere boring and reachable — a separate savings account, not an investment.",
      "One month lifts the stop. Three to six months is what actually makes ownership comfortable.",
      "Set it up as an automatic transfer so it does not depend on remembering.",
    ],
  },
  {
    code: "CREDIT_UNDER_620",
    title: "Credit score under 620",
    threshold: "Credit score below 620",
    why: "Below 620, lenders price the loan as high-risk. The interest difference over a thirty-year term can cost more than the down payment you spent years assembling — so waiting here is usually the cheaper decision, not the slower one.",
    clear: [
      "Pull your reports from all three bureaus and dispute anything that is not yours. Errors are common and free to fix.",
      "Bring every account current, then keep every payment on time — payment history carries the most weight.",
      "Get card balances under 30% of their limits, and lower if you can.",
      "Leave old accounts open. Length of history counts in your favor even when the card sits unused.",
    ],
  },
  {
    code: "HOUSING_RATIO_OVER_45",
    title: "Housing above 45% of income",
    threshold: "Monthly housing cost over 45% of monthly income",
    why: "This is the line where one bad month becomes a crisis. Above it, the house is affordable only while nothing goes wrong — and something always goes wrong. Note that the payment includes taxes, insurance and any association dues, not the loan alone.",
    clear: [
      "Add the full monthly cost — principal, interest, taxes, insurance, dues — not the quoted payment.",
      "Look at a lower price band. Nothing moves this ratio faster.",
      "A larger down payment shrinks the financed amount and the payment with it.",
      "If income is about to rise on a date you can name, the honest answer may be to wait for the date.",
    ],
  },
];

export default function HardStopsGuidePage() {
  return (
    <>
      <section className="px-6 pb-12 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl">
          <Link href="/guides" className="text-sm text-dim transition-colors hover:text-cyan">
            &larr; All guides
          </Link>
          <h1 className="mt-5 type-h1">Hard stops — when to wait</h1>
          <p className="mt-5 text-lg leading-relaxed text-dim">
            Four conditions pause any readiness score, whatever the rest of the numbers say. They
            are not a grade and not a rejection. They are the four places where buying now would
            most likely hurt you, and every one of them is temporary.
          </p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 pb-8">
          <div className="mx-auto max-w-3xl">
            <div className="glass card-hairline-top p-6 sm:p-8">
              <h2 className="type-h3">Why a score can be overridden</h2>
              <p className="mt-3 text-base leading-relaxed text-dim">
                A composite score averages. Averaging is exactly wrong when one input is
                catastrophic — a strong emotional and timing read can carry a genuinely dangerous
                balance sheet over the line. So these four sit outside the average: when one
                trips, the verdict is held back regardless of the total, and the reason is named.
                Protective, not punitive. Clear the condition and your real number returns.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {HARD_STOPS.map((stop, i) => (
            <Reveal key={stop.code} delay={(i % 2) * 100}>
              <article className="glass p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-crimson/25 bg-crimson/[0.08] text-crimson"
                  >
                    <ShieldAlert size={18} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="type-h3">{stop.title}</h2>
                    <p className="num mt-1 text-sm font-semibold text-crimson">
                      {stop.threshold}
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-base leading-relaxed text-dim">{stop.why}</p>

                <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-light">
                  How to clear it
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {stop.clear.map((step) => (
                    <li key={step} className="flex gap-3 text-sm leading-relaxed text-dim">
                      <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="hairline" />
            <div className="mt-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <h2 className="type-h3">See whether any of these apply to you.</h2>
                <p className="mt-2 text-sm text-dim">
                  Educational guidance only — HōMI is not a lender and this is not a lending
                  decision. If a stop trips, you will be told which one and why.
                </p>
              </div>
              <Link
                href="/assessment?utm_source=guides&utm_medium=organic&utm_campaign=hard-stops"
                className="btn btn-primary shrink-0"
              >
                Start Decision Readiness
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
