/**
 * Static content module for the marketing Learning hub and per-article pages.
 * Plain data — no fetches, no client state. Same shape as guides-data.ts:
 * an ordered list of sections (heading + paragraphs) so pages can render
 * consistent typography without parsing markdown.
 *
 * Learning is the "why" behind the method — Guides are the "how."
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
        heading: "Why 28/36/43 are the lines that matter",
        paragraphs: [
          "HōMI's Financial Reality pillar scores DTI on a scale that mirrors decades of lending convention, because those lines exist for real structural reasons, not tradition for its own sake. At or below 28%, you earn the full 10 points — this is the range where a mortgage payment sits comfortably alongside everything else you're paying down, with room left over.",
          "Between 28% and 36%, you earn 7 points. It's manageable, but the margin is thinner — a raise you were counting on, or a rate that stays where you expect it, matters more here than it did in the lower band. Between 36% and 43%, you earn 4 points. This is the zone where a single missed expectation — income growth that stalls, a debt that takes longer to pay off than planned — turns manageable into tight. Above 43%, you earn zero points for this factor. Lenders themselves start hesitating here; the math is telling you something before anyone else does.",
        ],
      },
      {
        heading: "Why 50% is a hard stop, not a low score",
        paragraphs: [
          "Every other DTI band costs you points. Crossing 50% costs you the entire verdict. Regardless of how strong your down payment, your credit, or your emotional readiness looks, a DTI above 50% forces HōMI's verdict to NOT YET.",
          "The reasoning is specific: above 50%, your monthly obligations leave almost no margin for the ordinary surprises of a life — a car repair, a medical bill, a slow month at work. It isn't that you can't make the payment this month. It's that you have no room to absorb the month that goes wrong, and eventually one does. That's a different kind of risk than a low score on a sub-factor, which is why it's treated differently.",
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
          "For the practical, step-by-step version of this — how to size a target monthly payment against your real number, not the lender's maximum — see our guide, How Much House You Can Actually Afford. For how DTI fits alongside the other three hard-stops, see The Four Hard Stops.",
        ],
      },
    ],
  },
  {
    slug: "the-four-hard-stops",
    title: "The Four Hard Stops",
    description:
      "Four conditions override every other number in the HōMI-Score. Not because the rest of your picture doesn't matter — because these four failure modes are severe enough that nothing else compensates for them.",
    sections: [
      {
        heading: "What a hard-stop actually does",
        paragraphs: [
          "Most of the HōMI-Score is a matter of degree. A lower down payment costs you points, not the whole verdict. A shorter time horizon costs you points, not the whole verdict. Four conditions work differently: if any one of them is true, the verdict is forced to NOT YET regardless of what the rest of the numbers say.",
          "That's a deliberate design choice, not an oversight. Averages hide danger. A high score built from strong credit and a solid down payment can still describe a household one bad month away from crisis, if the number that actually protects against a bad month is missing. Hard-stops exist so that one severe risk can't be diluted into invisibility by three unrelated strengths.",
        ],
      },
      {
        heading: "Hard-stop one: DTI over 50%",
        paragraphs: [
          "Debt-to-income above 50% means more than half your gross income already has somewhere to go before you've bought anything. It leaves almost no margin for surprises — a slow month, a repair, a gap between jobs. This is covered in full detail in our article Understanding Your DTI; the short version is that above this line, the math itself is the risk, independent of every other factor.",
        ],
      },
      {
        heading: "Hard-stop two: housing payment over 45% of gross income",
        paragraphs: [
          "This is a narrower, more specific ratio than DTI — principal, interest, taxes, insurance, and HOA dues (PITI + HOA), measured against gross monthly income alone. Above roughly 45%, one bad month doesn't just strain your budget. It threatens the roof over your head directly, because housing is the one payment you can't easily reduce or defer without real consequences.",
          "This hard-stop protects against a specific and common trap: a household that looks fine on paper-wide DTI because other debts are low, but is nonetheless committing an outsized share of income to the house itself. Low overall debt doesn't offset an oversized mortgage payment.",
        ],
      },
      {
        heading: "Hard-stop three: emergency runway under one month",
        paragraphs: [
          "Runway is the number of months your essential expenses are covered if income stopped tomorrow, held in something liquid and accessible — not a retirement account, not the down payment itself. Below one month, there is no cushion between you and the first real surprise homeownership brings, and there's always a first surprise.",
          "This hard-stop protects against the single most common story behind post-purchase financial stress: not the mortgage payment itself, but the water heater, the roof, the year property taxes jump, arriving with nothing set aside to absorb them. For the full mechanics of what counts as runway and how much is enough, see our article Emergency Runway Mechanics.",
        ],
      },
      {
        heading: "Hard-stop four: credit score under 620",
        paragraphs: [
          "620 is roughly where conventional mortgage pricing shifts meaningfully against a borrower. Below it, available loan products narrow and the rates offered climb — sometimes enough that the added interest cost over the life of the loan quietly undoes the value of the purchase itself. This protects against a decision that looks affordable at the offer stage but becomes expensive over 15 to 30 years of a higher rate.",
        ],
      },
      {
        heading: "Protection, not punishment",
        paragraphs: [
          "None of these four exist to shame anyone. They exist because some risks are severe enough that no amount of strength elsewhere compensates for them — the same logic behind a building code line that doesn't bend just because the rest of the structure is sound. Not yet is not no. It is clarity. It is protection.",
          "Every hard-stop is also a to-do list. A DTI hard-stop points at debt to pay down. A runway hard-stop points at savings to build. A credit hard-stop points at a specific, time-bound project. Build First is not failure. It is the map — and these four thresholds are usually the first four lines on it.",
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
          "A rules-based system is good at exactly the things people are inconsistent at: applying the same threshold every time, weighing dozens of inputs simultaneously without fatigue, and doing it without a commission riding on the outcome. Run the same numbers through the same engine twice, on two different days, in two different moods, and you get the same answer both times. That consistency has real value, because human financial advice is notoriously inconsistent — the same buyer can get different guidance depending on which lender, which agent, or which day they ask.",
          "Pattern-matching across many inputs quickly is the other genuine strength. Debt-to-income, down payment, emergency runway, credit, life stability, confidence, alignment, pressure, time horizon, savings rate, down payment progress — eleven distinct inputs, weighed the same way every time. A person doing that mental math on the fly, informally, tends to over-weight whichever number feels most urgent that day.",
        ],
      },
      {
        heading: "Where it has no business deciding for you",
        paragraphs: [
          "None of that consistency extends to the parts of this decision that are irreducibly yours. Your gut isn't noise to be filtered out before getting to the real numbers — it's data, measured deliberately in the Emotional Truth pillar because it predicts regret about as reliably as any ratio does. No system outside you can honestly tell you whether you're truly ready, whether your relationship is aligned, or whether the timing fits the actual shape of your life this year. Those questions have systematic inputs — sliders, self-reports — but the answers only mean something because you're the one giving them.",
          "This is also why HōMI never tells you to buy, sell, or invest. It tells you where you stand against a fixed, explainable set of thresholds, and leaves the decision itself with you.",
        ],
      },
      {
        heading: "A rules engine, not a black box",
        paragraphs: [
          "It's worth being plain about what HōMI's scoring actually is, mechanically: a deterministic rules engine. Three pillars, fixed point maximums, explicit thresholds, four hard-stops defined in advance. The same inputs produce the same score every time, and every point in that score can be traced back to a specific, statable reason — this ratio, this threshold, this sub-factor. There's no hidden model inferring a verdict from patterns no one can inspect. If a score feels wrong, the reason is always visible.",
          "That's a deliberate choice. A decision this consequential deserves an answer you can audit, not one you have to trust on faith.",
        ],
      },
      {
        heading: "Educational guidance, not a verdict on your life",
        paragraphs: [
          "HōMI is not a lender, a mortgage broker, a registered investment advisor, a credit bureau, a real estate agent, a financial planner, or a bank. It provides educational guidance only — a clear, honest read on where you stand against known thresholds, not a recommendation to act. Systematic and rules-based describe the method. They don't describe an authority over your decision, because that authority stays with you.",
          "For the deeper mechanics behind the specific rules the engine applies, see The Three-Pillar Method: A Deep Dive. For the practical side of using a tool like this without outsourcing the decision itself, see our guide, Timing the Market vs. Timing Your Life.",
        ],
      },
    ],
  },
  {
    slug: "the-three-pillar-method-deep-dive",
    title: "The Three-Pillar Method: A Deep Dive",
    description:
      "Financial Reality, Emotional Truth, and Perfect Timing — why they carry almost equal weight, and what each one is actually measuring underneath.",
    sections: [
      {
        heading: "Why three pillars, and why almost equal",
        paragraphs: [
          "The HōMI-Score is built from three pillars: Financial Reality, worth up to 35 points and answering can you afford it; Emotional Truth, also worth up to 35 points and answering do you really want it; and Perfect Timing, worth up to 30 points and answering is now the right moment. Together they sum to a 0-100 score.",
          "The near-equal weighting is the point, not an accident. Most financial tools weight the numeric pillar heavily and treat everything else as a footnote. HōMI treats emotional and timing factors as predictive signals with real weight, because a financially sound purchase made under pressure, or made before someone is genuinely ready, produces regret just as reliably as a bad debt-to-income ratio does.",
        ],
      },
      {
        heading: "Financial Reality: can you afford it",
        paragraphs: [
          "Four sub-factors make up the 35 points: debt-to-income (up to 10 points, scored on the 28/36/43 bands described in understanding-your-dti), down payment (up to 10 points, full credit at 20% or more, tapering down to zero below 5%), emergency fund (up to 8 points, full credit at six months or more of expenses, zero below one month, which is also a hard-stop), and credit health (up to 7 points, full credit at 740 and above, zero below 660, with under 620 also a hard-stop). This pillar is the closest to what a lender evaluates, but scored against your margin, not their approval threshold.",
        ],
      },
      {
        heading: "Emotional Truth: do you really want it",
        paragraphs: [
          "Four sub-factors make up the 35 points here too, though the composition differs: life stability (up to 9 points), confidence level (up to 9 points), partner alignment (up to 9 points, redistributed proportionally across the other three factors if you're single or have no partner in the decision), and FOMO or external pressure (up to 8 points, inverted — a high self-reported pressure score counts against readiness, not for it, since pressure that isn't yours is one of the more reliable predictors of later regret).",
          "None of these are soft in the sense of unmeasurable or unimportant. They're self-reported, which is different from being unreliable — a person's honest read on their own confidence and pressure is real data, just as real as a bank statement.",
        ],
      },
      {
        heading: "Perfect Timing: is now the right moment",
        paragraphs: [
          "Three sub-factors make up the 30 points: time horizon (up to 10 points, full credit beyond 12 months, tapering down for a horizon under 3 months), savings rate (up to 10 points, full credit at 20% or more of income saved monthly, tapering down below 5%), and down payment progress toward your own goal (up to 10 points, full credit at 80% or more progress, tapering down below 25%).",
          "This pillar isn't about predicting the housing market. It's about whether your own trajectory — how much runway you have before you need to decide, how fast you're actually saving, how close you are to your own target — gives the other two pillars time to catch up, instead of forcing a decision on someone else's clock.",
        ],
      },
      {
        heading: "Why the weighting holds up",
        paragraphs: [
          "A household can be financially exceptional and still make a decision they regret within a year, if it was rushed or misaligned. A household can be financially modest but genuinely ready, if the timing and the shared conviction are real. Weighting all three pillars close to equally reflects that regret is rarely purely financial — it's usually about the combination. When all three rings align, your compass becomes a key.",
          "For how the four hard-stops interact with these three pillars, see The Four Hard Stops. For a practical walkthrough of the emotional pillar specifically, see our guide, Reading Your Emotional Signals.",
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
          "A HōMI-Score of 80 or above returns READY: your Financial Reality, Emotional Truth, and Perfect Timing all clear a high bar, with no hard-stops active. A score of 65 to 79 returns ALMOST THERE: the overall picture is strong, with one or two areas still worth closing before moving. A score of 50 to 64 returns BUILD FIRST: there's a clear, specific gap or set of gaps, and the honest next step is building before buying. Below 50, or with any hard-stop active regardless of score, the verdict is NOT YET.",
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
          "BUILD FIRST tends to feel like the disappointing middle verdict, but it's usually the most useful one, because it comes with a legible gap attached — a DTI to bring down, a runway to build, a credit line to clear. Build First is not failure. It is the map. Every sub-score in the breakdown points at something specific and buildable, on a timeline measured in months, not years.",
        ],
      },
      {
        heading: "What to do with any verdict",
        paragraphs: [
          "A verdict is a snapshot, not a sentence — retaking the assessment as your numbers change is the intended use, not a one-time judgment. For the practical mechanics behind the two hard-to-diagnose pillars, see our guides, Reading Your Emotional Signals and The Real Cost of Waiting vs. Rushing. For the underlying math behind the score itself, see The Three-Pillar Method: A Deep Dive.",
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
          "Three to six months of essential expenses is the range that gives most households real protection against an ordinary disruption — a layoff, a medical issue, a major repair. Below three months, a single bad stretch can force decisions made from panic rather than clarity. Below one month specifically, HōMI treats this as a hard-stop: the verdict is forced to NOT YET regardless of every other number, because owning a home means owning the surprises that come with it, and there's no version of readiness that works with nothing underneath it.",
          "Above six months starts trading off against other goals — a larger down payment, faster debt payoff — with diminishing additional protection, though there's no penalty in the score for holding more.",
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
