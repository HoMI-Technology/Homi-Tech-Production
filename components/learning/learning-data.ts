/**
 * Static content module for the marketing Learning hub and per-article pages.
 * Plain data — no fetches, no client state. Same shape as guides-data.ts:
 * an ordered list of sections (heading + paragraphs) so pages can render
 * consistent typography without parsing markdown.
 *
 * Learning is the "why" behind the method — Guides are the "how."
 *
 * SECRECY (2026-08 audit): these articles are public marketing surfaces. The
 * exact pillar weights, sub-factor point values, verdict score lines, and
 * hard-stop cutoffs are trade-secret and must never appear here — the public
 * model is qualitative only, so the protective signal cannot be gamed.
 * brand-check N21–N25 enforce this over components/learning.
 */

export interface LearningSection {
  heading: string;
  paragraphs: string[];
}

export interface LearningArticle {
  slug: string;
  title: string;
  description: string;
  sections: LearningSection[];
}

export const LEARNING_ARTICLES: LearningArticle[] = [
  {
    slug: "understanding-your-dti",
    title: "Understanding Your DTI",
    description:
      "Debt-to-income ratio is the first number any lender looks at, and one of the first HōMI looks at too — for a different reason. Here's the actual math.",
    sections: [
      {
        heading: "What the ratio actually is",
        paragraphs: [
          "Debt-to-income ratio, or DTI, is simple to calculate and easy to get wrong by omission. Add up your minimum monthly debt payments — car loans, student loans, credit card minimums, personal loans, any court-ordered payments — and divide by your gross monthly income, meaning income before taxes. The result is a percentage. A household earning $6,000 a month with $1,500 in monthly debt payments has a DTI of 25%.",
          "The two mistakes people make are using net income instead of gross, which understates the ratio, and forgetting a debt that doesn't feel like debt — a 0% promotional car loan, a payment plan on a phone, a private loan from family with a real repayment schedule. Lenders count all of it. So does HōMI.",
        ],
      },
      {
        heading: "Why lenders watch the same bands",
        paragraphs: [
          "Lending convention has watched the same handful of DTI bands for decades — you will often hear 28/36/43 quoted — because those lines exist for real structural reasons, not tradition for its own sake. The lower your ratio sits beneath them, the more comfortably a mortgage payment fits alongside everything else you're paying down, with room left over for the month that doesn't go to plan.",
          "HōMI's Financial Reality pillar pays attention to the same territory, scored against your margin rather than a lender's approval bar. Exactly how the bands translate into your score stays private — the signal is more honest when it can't be answered around. What never changes is the direction: every point of DTI you shed is real margin, and margin is what absorbs surprises.",
        ],
      },
      {
        heading: "When DTI stops costing points and starts deciding",
        paragraphs: [
          "Push the ratio high enough and the question stops being how much it costs your score. Past a certain line, HōMI treats an oversized debt load as a hard-stop: the verdict is forced to its most protective answer regardless of how strong your down payment, your credit, or your emotional readiness looks. The exact line stays private — naming it would tell you how to answer around it instead of how to fix it.",
          "The reasoning is specific: at some point your monthly obligations leave almost no margin for the ordinary surprises of a life — a car repair, a medical bill, a slow month at work. It isn't that you can't make the payment this month. It's that you have no room to absorb the month that goes wrong, and eventually one does. That's a different kind of risk than a weak sub-factor, which is why it's treated differently.",
        ],
      },
      {
        heading: "Two audiences, two reasons to care",
        paragraphs: [
          "Lenders care about DTI because it predicts default risk to them — will you make the payment. HōMI cares about the same number for a different reason: will making the payment cost you the rest of your financial life. A DTI that clears a lender's approval bar can still leave you with no room to save, to handle an emergency, or to feel anything other than stretched every month.",
          "That's the gap HōMI is built to close. The lender's approval and your actual readiness are two different questions that happen to share one input number.",
        ],
      },
      {
        heading: "Lowering it before it matters",
        paragraphs: [
          "DTI moves in only two directions: pay down debt, or grow income, and the former is faster to control. Paying off a car loan with six months left can move your ratio more than a raise would, because it removes a fixed monthly obligation entirely rather than just growing the denominator.",
          "For the practical, step-by-step version of this — how to size a target monthly payment against your real number, not the lender's maximum — see our guide, How Much House You Can Actually Afford. For how DTI fits alongside the other hard-stops, see The Four Hard Stops.",
        ],
      },
    ],
  },
  {
    slug: "the-four-hard-stops",
    title: "The Four Hard Stops",
    description:
      "Four conditions can override every other number in the HōMI-Score. Not because the rest of your picture doesn't matter — because these four failure modes are severe enough that nothing else compensates for them.",
    sections: [
      {
        heading: "What a hard-stop actually does",
        paragraphs: [
          "Most of the HōMI-Score is a matter of degree. A lower down payment costs you ground, not the whole verdict. A shorter time horizon costs you ground, not the whole verdict. Four conditions work differently: if any one of them is true, the verdict is forced to NOT YET regardless of what the rest of the picture says.",
          "That's a deliberate design choice, not an oversight. Averages hide danger. A strong-looking score built from solid credit and a real down payment can still describe a household one bad month away from crisis, if the number that actually protects against a bad month is missing. Hard-stops exist so that one severe risk can't be diluted into invisibility by unrelated strengths.",
          "We don't publish the exact lines. Naming them would tell you how to answer around them instead of how to fix the underlying condition — and the point of a protective signal is that it can't be gamed. What we can tell you is what each condition looks like and how to build past it.",
        ],
      },
      {
        heading: "Hard-stop one: debt payments crowd out the margin",
        paragraphs: [
          "When monthly debt payments take too large a share of gross income, almost nothing is left for surprises — a slow month, a repair, a gap between jobs. The mechanics of the ratio itself are covered in full detail in our article Understanding Your DTI; the short version is that past a certain line, the math itself is the risk, independent of every other factor.",
        ],
      },
      {
        heading: "Hard-stop two: housing costs crowd the paycheck",
        paragraphs: [
          "This is a narrower, more specific ratio than DTI — the full housing payment, including taxes, insurance, and any association dues, measured against gross monthly income alone. Commit too large a share of the paycheck to the house itself and one bad month doesn't just strain your budget. It threatens the roof over your head directly, because housing is the one payment you can't easily reduce or defer without real consequences.",
          "This hard-stop protects against a specific and common trap: a household that looks fine on overall DTI because other debts are low, but is nonetheless committing an outsized share of income to the house itself. Low overall debt doesn't offset an oversized mortgage payment.",
        ],
      },
      {
        heading: "Hard-stop three: essentially nothing set aside",
        paragraphs: [
          "Runway is the number of months your essential expenses are covered if income stopped tomorrow, held in something liquid and accessible — not a retirement account, not the down payment itself. When there is essentially nothing set aside, there is no cushion between you and the first real surprise homeownership brings, and there's always a first surprise.",
          "This hard-stop protects against the single most common story behind post-purchase financial stress: not the mortgage payment itself, but the water heater, the roof, the year property taxes jump, arriving with nothing to absorb them. For the full mechanics of what counts as runway and how much is enough, see our article Emergency Runway Mechanics.",
        ],
      },
      {
        heading: "Hard-stop four: credit priced as high-risk",
        paragraphs: [
          "There is a band where mortgage pricing shifts meaningfully against a borrower: available loan products narrow and the rates offered climb — sometimes enough that the added interest cost over the life of the loan quietly undoes the value of the purchase itself. When your credit sits in the band lenders price as high-risk, HōMI treats the decision as premature no matter how the rest of the picture looks. This protects against a decision that looks affordable at the offer stage but becomes expensive over decades of a higher rate.",
        ],
      },
      {
        heading: "Protection, not punishment",
        paragraphs: [
          "None of these four exist to shame anyone. They exist because some risks are severe enough that no amount of strength elsewhere compensates for them — the same logic behind a building code line that doesn't bend just because the rest of the structure is sound. Not yet is not no. It is clarity. It is protection.",
          "Every hard-stop is also a to-do list. A debt hard-stop points at balances to pay down. A runway hard-stop points at savings to build. A credit hard-stop points at a specific, time-bound project. Build First is not failure. It is the map — and clearing a hard-stop is usually the first line on it.",
        ],
      },
    ],
  },
  {
    slug: "how-ai-fits-a-readiness-decision",
    title: "How AI Fits a Readiness Decision",
    description:
      "An honest answer to where automated systems genuinely help with a decision like this, and where they have no business deciding for you.",
    sections: [
      {
        heading: "Where automation actually helps",
        paragraphs: [
          "A rules-based system is good at exactly the things people are inconsistent at: applying the same standard every time, weighing many inputs simultaneously without fatigue, and doing it without a commission riding on the outcome. Run the same numbers through the same engine twice, on two different days, in two different moods, and you get the same answer both times. That consistency has real value, because human financial advice is notoriously inconsistent — the same buyer can get different guidance depending on which lender, which agent, or which day they ask.",
          "Pattern-matching across many inputs quickly is the other genuine strength. Debt-to-income, down payment, emergency runway, credit, life stability, confidence, alignment, pressure, time horizon, savings rate, down payment progress — a dozen distinct inputs, weighed the same way every time. A person doing that mental math on the fly, informally, tends to over-weight whichever number feels most urgent that day.",
        ],
      },
      {
        heading: "Where it has no business deciding for you",
        paragraphs: [
          "None of that consistency extends to the parts of this decision that are irreducibly yours. Your gut isn't noise to be filtered out before getting to the real numbers — it's data, measured deliberately in the Emotional Truth pillar because it predicts regret about as reliably as any ratio does. No system outside you can honestly tell you whether you're truly ready, whether your relationship is aligned, or whether the timing fits the actual shape of your life this year. Those questions have systematic inputs — sliders, self-reports — but the answers only mean something because you're the one giving them.",
          "This is also why HōMI never tells you to buy, sell, or invest. It tells you where you stand against a fixed, explainable standard, and leaves the decision itself with you.",
        ],
      },
      {
        heading: "A rules engine, not a black box",
        paragraphs: [
          "It's worth being plain about what HōMI's scoring actually is, mechanically: a deterministic rules engine. Three pillars, defined inputs, protective hard-stops set in advance. The same inputs produce the same score every time, and in your own report every part of that score traces back to a specific, statable factor — this ratio, this answer, this trend. There's no hidden model inferring a verdict from patterns no one can inspect. If a score feels wrong, your own breakdown shows you why.",
          "That's a deliberate choice. A decision this consequential deserves an answer you can audit, not one you have to trust on faith. What stays private is the exact calibration — the weights and lines — so the read stays honest for everyone, including you.",
        ],
      },
      {
        heading: "Educational guidance, not a verdict on your life",
        paragraphs: [
          "HōMI is not a lender, a mortgage broker, a registered investment advisor, a credit bureau, a real estate agent, a financial planner, or a bank. It provides educational guidance only — a clear, honest read on where you stand, not a recommendation to act. Systematic and rules-based describe the method. They don't describe an authority over your decision, because that authority stays with you.",
          "For the deeper mechanics behind the pillars the engine weighs, see The Three-Pillar Method: A Deep Dive. For the practical side of using a tool like this without outsourcing the decision itself, see our guide, Timing the Market vs. Timing Your Life.",
        ],
      },
    ],
  },
  {
    slug: "the-three-pillar-method-deep-dive",
    title: "The Three-Pillar Method: A Deep Dive",
    description:
      "Financial Reality, Emotional Truth, and Perfect Timing — what each one is actually measuring underneath, and why no single pillar decides alone.",
    sections: [
      {
        heading: "Why three pillars",
        paragraphs: [
          "The HōMI-Score is built from three pillars: Financial Reality, answering can you afford it; Emotional Truth, answering do you really want it; and Perfect Timing, answering is now the right moment. Together they combine into a single score on a 0–100 scale. Exactly how they're weighed stays private — a readiness signal anyone can reverse-engineer is a readiness signal anyone can game.",
          "That no single pillar decides alone is the point, not an accident. Most financial tools weight the numeric side heavily and treat everything else as a footnote. HōMI treats emotional and timing factors as predictive signals with real weight, because a financially sound purchase made under pressure, or made before someone is genuinely ready, produces regret just as reliably as a bad debt-to-income ratio does.",
        ],
      },
      {
        heading: "Financial Reality: can you afford it",
        paragraphs: [
          "Four sub-factors make up this pillar: debt-to-income, down payment, emergency runway, and credit health. This is the closest to what a lender evaluates, but scored against your margin, not their approval threshold. How much each sub-factor carries, and where the full-strength lines sit, stays private — your own report shows you which ones are holding you back, which is the part that matters.",
        ],
      },
      {
        heading: "Emotional Truth: do you really want it",
        paragraphs: [
          "Four sub-factors make up this pillar too, though the composition differs: life stability, confidence, partner alignment — redistributed across the other factors if you're single or have no partner in the decision — and outside pressure, which counts against readiness rather than for it, since pressure that isn't yours is one of the more reliable predictors of later regret.",
          "None of these are soft in the sense of unmeasurable or unimportant. They're self-reported, which is different from being unreliable — a person's honest read on their own confidence and pressure is real data, just as real as a bank statement.",
        ],
      },
      {
        heading: "Perfect Timing: is now the right moment",
        paragraphs: [
          "Three sub-factors make up this pillar: your time horizon, your savings rate, and your progress toward your own down payment goal. Each one is measured against your own trajectory, not against the market.",
          "This pillar isn't about predicting the housing market. It's about whether your own trajectory — how much runway you have before you need to decide, how fast you're actually saving, how close you are to your own target — gives the other two pillars time to catch up, instead of forcing a decision on someone else's clock.",
        ],
      },
      {
        heading: "Why the weighting holds up",
        paragraphs: [
          "A household can be financially exceptional and still make a decision they regret within a year, if it was rushed or misaligned. A household can be financially modest but genuinely ready, if the timing and the shared conviction are real. All three pillars carry real weight in the read, because regret is rarely purely financial — it's usually about the combination. When all three rings align, your compass becomes a key.",
          "For how the hard-stops interact with these three pillars, see The Four Hard Stops. For a practical walkthrough of the emotional pillar specifically, see our guide, Reading Your Emotional Signals.",
        ],
      },
    ],
  },
  {
    slug: "reading-a-verdict",
    title: "Reading a Verdict",
    description:
      "READY, ALMOST THERE, BUILD FIRST, NOT YET — what each one actually means, the temperature metaphor behind them, and why the least welcome verdict is the one doing the most protecting.",
    sections: [
      {
        heading: "The four verdicts, plainly",
        paragraphs: [
          "READY means all three pillars clear a high bar, with no hard-stops active — the math holds, the timing fits, the desire is genuinely yours. ALMOST THERE means the overall picture is strong, with one or two specific areas still worth closing before moving. BUILD FIRST means there's a clear, specific gap or set of gaps, and the honest next step is building before buying. NOT YET means moving now would put you somewhere you can't easily get back from — it arrives when a hard-stop is active, or when the overall picture simply isn't there yet.",
          "Where the exact score lines sit between one verdict and the next stays private. The point of a verdict is to tell you the truth about where you stand, and a truth anyone can aim at instead of at their actual readiness stops being one.",
        ],
      },
      {
        heading: "The temperature metaphor",
        paragraphs: [
          "HōMI maps each verdict to a temperature, and the metaphor is deliberate: READY is Cool — the decision has settled, nothing left to force. ALMOST THERE is Warm — close, with real movement still possible in a short window. BUILD FIRST is Warm-plus — active work in progress, not a stall. NOT YET is Hot — meaning urgent and unsettled, not meaning bad. Heat, here, describes how much is still unresolved, not how much you've failed.",
        ],
      },
      {
        heading: "Why NOT YET isn't a rejection",
        paragraphs: [
          "Most people who take the assessment aren't told READY, and that's not a flaw in the tool — it's what an honest readiness system looks like when it's actually measuring something instead of flattering everyone who takes it. Home-buying readiness is a genuinely high bar across three independent pillars simultaneously, and most people are still building toward it in at least one dimension at any given time. That's the ordinary state, not a warning sign.",
          "Not yet is not no. It is clarity. It is protection — a specific, honest answer that replaces the vague uncertainty of not knowing where you stand with an actual accounting of what's missing and what to work on next.",
        ],
      },
      {
        heading: "BUILD FIRST is the map, not the punishment",
        paragraphs: [
          "BUILD FIRST tends to feel like the disappointing middle verdict, but it's usually the most useful one, because it comes with a legible gap attached — a debt load to bring down, a runway to build, a credit project to finish. Build First is not failure. It is the map. Every part of your breakdown points at something specific and buildable, on a timeline measured in months, not years.",
        ],
      },
      {
        heading: "What to do with any verdict",
        paragraphs: [
          "A verdict is a snapshot, not a sentence — retaking the assessment as your numbers change is the intended use, not a one-time judgment. For the practical mechanics behind the two hard-to-diagnose pillars, see our guides, Reading Your Emotional Signals and The Real Cost of Waiting vs. Rushing. For the thinking behind the score itself, see The Three-Pillar Method: A Deep Dive.",
        ],
      },
    ],
  },
  {
    slug: "emergency-runway-mechanics",
    title: "Emergency Runway Mechanics",
    description:
      "What actually counts as runway, how many months is genuinely enough, and why it's the first thing people quietly borrow from when a down payment feels close.",
    sections: [
      {
        heading: "What counts, and what doesn't",
        paragraphs: [
          "Emergency runway is the number of months your essential expenses are covered by money you can access without penalty or delay — a savings or checking account, not a retirement account you'd pay taxes and an early-withdrawal penalty to touch, and not the down payment itself, which has its own job to do. If accessing it costs you money or takes weeks, it isn't runway in any way that helps you during an actual emergency.",
        ],
      },
      {
        heading: "Sized against essential expenses, not current spending",
        paragraphs: [
          "Runway should be measured against what you'd actually need to keep paying if income stopped tomorrow — housing, utilities, food, insurance, minimum debt payments — not your current, fuller budget. Most discretionary spending disappears on its own during a real income gap; sizing runway against your full current spending overstates what you need and can discourage saving toward a number that was never the right target.",
        ],
      },
      {
        heading: "How much is enough",
        paragraphs: [
          "Three to six months of essential expenses is the range that gives most households real protection against an ordinary disruption — a layoff, a medical issue, a major repair. Below three months, a single bad stretch can force decisions made from panic rather than clarity. And when there is essentially nothing set aside, HōMI treats this as a hard-stop: the verdict is forced to its most protective answer regardless of every other strength, because owning a home means owning the surprises that come with it, and there's no version of readiness that works with nothing underneath it.",
          "Past the six-month mark you start trading off against other goals — a larger down payment, faster debt payoff — with diminishing additional protection, though there's no penalty in the score for holding more.",
        ],
      },
      {
        heading: "The first thing people quietly cut",
        paragraphs: [
          "When a down payment goal feels just out of reach, the emergency fund is the account most likely to get quietly raided, because it's the one without a name on a specific purchase. That instinct is understandable and usually backfires: a slightly smaller down payment with real runway intact is a stronger position than a larger down payment with nothing left over, because lenders will approve either, but only one of them protects you after closing when the first repair bill arrives.",
        ],
      },
      {
        heading: "Building it as its own project",
        paragraphs: [
          "If runway is the gap in your BUILD FIRST plan, it belongs near the top of the list, ahead of the down payment itself. The clearest sign it's working isn't the total balance — it's the trend, a savings rate that's consistently, even slowly, funding the account. For the practical guide on sequencing this against your other goals, see our guide, Emergency Runway Before Everything. For how this hard-stop fits alongside the other three, see The Four Hard Stops.",
        ],
      },
    ],
  },
];

export function getArticle(slug: string): LearningArticle | undefined {
  return LEARNING_ARTICLES.find((a) => a.slug === slug);
}

export function getAllArticleSlugs(): string[] {
  return LEARNING_ARTICLES.map((a) => a.slug);
}
