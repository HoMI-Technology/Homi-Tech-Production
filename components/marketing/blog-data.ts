/**
 * Static content module for the marketing Blog. Same structural spirit as
 * guides-data.ts, but posts carry a date and read time, and sections may
 * have an optional heading (blog posts can open with unheaded prose).
 */

export interface BlogSection {
  heading?: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO "YYYY-MM-DD"
  readMinutes: number;
  sections: BlogSection[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-we-built-the-platform-that-says-not-yet",
    title: "Why We Built the Platform That Says Not Yet",
    description:
      "Every other voice in this decision profits when you say yes. We built HōMI to profit from clarity instead — including the clarity of an honest no.",
    date: "2026-06-24",
    readMinutes: 5,
    sections: [
      {
        paragraphs: [
          "Here's a strange fact about buying a home: almost everyone giving you advice along the way gets paid the moment you say yes, and gets paid nothing if you say not yet. The agent, the lender, the loan officer — their income depends on the transaction closing, not on whether the transaction was right for you five years later. That's not a conspiracy. It's just how the incentives are built. But it means the advice you're getting was never designed to be neutral.",
        ],
      },
      {
        heading: "The gap nobody names",
        paragraphs: [
          "We didn't set out to build another calculator. There are plenty of those, and most of them answer the wrong question anyway — they tell you the biggest number a bank will lend you, not the number that lets you keep living the life you actually want afterward. What we noticed was a structural gap: nobody in the chain of people advising a first-time or next-time buyer has an incentive to say, honestly, 'not yet.' Saying that costs them the deal.",
          "So we built something whose business doesn't depend on the deal. HōMI doesn't make money when you buy. It doesn't take a cut of a mortgage, a referral fee from an agent, or a commission of any kind tied to a transaction. That's not a marketing line — it's a structural choice about how the product works, and it's the reason the assessment can tell you the truth without a competing incentive whispering the opposite.",
        ],
      },
      {
        heading: "What 'not yet' actually protects",
        paragraphs: [
          "Not yet is not no. It is clarity. It is protection. Most people don't regret what they bought — they regret when they bought it, and 'when' is almost always the question that got rushed past on the way to closing. We wanted a tool that would slow down at exactly the moment everyone else is speeding up, and tell you plainly where the gap is: this ratio, this cushion, this timing signal.",
          "That's the whole thesis. Not disruption, not a smarter algorithm outsmarting the market — just an honest read, delivered by something that isn't waiting on your signature to get paid. If that sounds unremarkable, good. It should. The remarkable part is how rare it turned out to be.",
        ],
      },
      {
        heading: "Read more",
        paragraphs: [
          "If you want the structural version of this argument — who actually gets paid, and when — read our next post, The Conflict of Interest Nobody Talks About.",
        ],
      },
    ],
  },
  {
    slug: "the-conflict-of-interest-nobody-talks-about",
    title: "The Conflict of Interest Nobody Talks About",
    description:
      "Lenders, agents, and brokers are paid when you close, not when you're ready. That single fact quietly shapes almost every piece of advice you'll get.",
    date: "2026-06-11",
    readMinutes: 6,
    sections: [
      {
        paragraphs: [
          "Ask any first-time buyer where their advice came from and you'll get a familiar list: an agent, a loan officer, maybe a mortgage broker, maybe a well-meaning relative repeating what their agent told them a decade ago. Almost none of that advice comes from someone paid to help you decide not to buy. It's worth sitting with how unusual that is for a decision this large.",
        ],
      },
      {
        heading: "How the payment structure shapes the advice",
        paragraphs: [
          "A real estate agent typically earns a commission calculated as a percentage of the sale price, paid at closing, and paid by nobody if the deal falls through. A loan officer earns an origination fee, again at closing, again paid by nobody if you decide to wait a year. None of this makes any individual agent or lender dishonest — most are genuinely trying to help within the frame they're given. But the frame itself only rewards one outcome: closing. It has no mechanism to reward the outcome of you waiting eight months to fix a DTI problem, even when that's clearly the better call.",
          "This is why lender approval letters lean so heavily on the maximum loan a household can carry rather than the amount it can live comfortably with, why urgency shows up so often in a listing conversation, and why a buyer with a fragile emergency fund rarely hears that fact framed as disqualifying. It's not that anyone is lying. It's that the entire chain of incentives points one direction, and it isn't your direction.",
        ],
      },
      {
        heading: "What a zero-conflict answer actually requires",
        paragraphs: [
          "To give an honest 'not yet,' a tool has to have nothing to lose by saying it. That was the actual design constraint behind HōMI's business model: it can't earn anything from the transaction itself, or the same conflict just gets rebuilt one layer down. HōMI profits from being useful before, during, and after a decision — not from being the reason a specific deal closed on a specific date.",
          "That distinction sounds abstract until you notice what it changes in practice. A tool with no stake in the transaction has no reason to soften a hard-stop, round up a shaky number, or frame urgency as opportunity. It can just say what the numbers say.",
        ],
      },
      {
        heading: "What this doesn't mean",
        paragraphs: [
          "None of this is an argument that agents and lenders are the enemy — most of them are doing an honest job inside an industry built around one payment event. It's an argument for having at least one voice in the process whose incentives don't run through that event. If you want the founding thesis behind why we built that voice this way, read Why We Built the Platform That Says Not Yet.",
        ],
      },
    ],
  },
  {
    slug: "most-people-dont-regret-what-they-bought",
    title: "Most People Don't Regret What They Bought",
    description:
      "The house is rarely the problem. The timing usually is — and rushing and waiting-too-long are two very different ways to get it wrong.",
    date: "2026-06-02",
    readMinutes: 5,
    sections: [
      {
        paragraphs: [
          "Talk to enough people a few years out from a home purchase and a pattern shows up that doesn't match the advice columns. Almost nobody says 'I wish I'd bought a different house.' A lot of people say some version of 'I wish it had been a different year.' The object was fine. The moment wasn't.",
        ],
      },
      {
        heading: "Two ways to get the 'when' wrong",
        paragraphs: [
          "Rushing has a distinct feeling — adrenaline, a deadline that belongs to someone else, a fear of missing a window that might not reopen. It shows up later as a drained emergency fund, a rate locked out of fear rather than analysis, an inspection contingency waived to win a bidding war. None of it looks like a mistake in the moment. It looks like decisiveness.",
          "Waiting too long feels like the opposite — like nothing at all, which is exactly why it's so easy to keep doing indefinitely. It doesn't announce itself with a monthly statement the way a bad mortgage term does. But it has a cost too: years of rent with nothing built, the same income growth you'd have had anyway now attached to a higher price, a readiness that quietly arrived and then sat unused for another year out of habit or fear.",
        ],
      },
      {
        heading: "Telling the difference from the inside",
        paragraphs: [
          "The honest test isn't how long you've been thinking about it. It's whether the picture is actually getting clearer or just staying stuck. If your savings rate is climbing, your down payment progress is building, and your emotional read on the decision keeps improving, that's not stalling — that's the plan working, and moving soon is readiness, not a rush. If none of that is true and you're moving anyway because of a headline or someone else's timeline, that's the other failure mode wearing a more confident face.",
          "We built the Perfect Timing pillar of the Decision Readiness Score specifically to separate these two, because they feel almost identical from the inside and produce almost opposite outcomes. A longer horizon isn't a stall if it's being used. A short one isn't readiness if it's borrowed from someone else's clock.",
        ],
      },
      {
        heading: "The question underneath both",
        paragraphs: [
          "Most people don't regret what they bought. They regret when they bought it. If you want the fuller breakdown of both failure modes and how to tell which one you're living, we wrote a longer practical guide on it: The Real Cost of Waiting vs. Rushing.",
        ],
      },
    ],
  },
  {
    slug: "what-a-readiness-score-actually-measures",
    title: "What a Readiness Score Actually Measures",
    description:
      "Not a credit score. Not an affordability calculator. Here's what the Decision Readiness Score is — and just as importantly, what it isn't.",
    date: "2026-05-19",
    readMinutes: 5,
    sections: [
      {
        paragraphs: [
          "The name invites a natural assumption: a 'score' that sounds like it might be another credit score, or another version of the max-loan number a lender hands you. It's neither, and the difference matters enough to spell out plainly.",
        ],
      },
      {
        heading: "Not a credit score",
        paragraphs: [
          "A credit score measures repayment history — how reliably you've handled debt over time. It says nothing about your emotional readiness, your timing, or whether the house you're considering fits the life you actually want. Credit is one input among eleven inside the Decision Readiness Score, not the whole of it.",
        ],
      },
      {
        heading: "Not an affordability calculator",
        paragraphs: [
          "An affordability calculator answers a narrower question: given this income and these debts, what's the largest loan a lender would likely approve. That's useful information, and it's part of the Financial Reality pillar. But it stops at the math. It has nothing to say about whether you're rushing, whether you and a partner are actually aligned, or whether your life circumstances this year support a decision this size. Plenty of people can afford a home, by that narrow definition, and still be nowhere near ready.",
        ],
      },
      {
        heading: "A composite read across three dimensions",
        paragraphs: [
          "What the Decision Readiness Score actually is: a composite readiness read across three pillars — Financial Reality, Emotional Truth, and Perfect Timing — weighed differently, each broken into specific, explainable sub-factors, with a small set of hard-stops acting as protective floors underneath all of it. It's a rules-based system, not a black box: every point traces back to a stated reason, and when certain red-line conditions are present they override the numeric score entirely, because those failure modes are severe enough that nothing else offsets them. The exact weights and red lines stay private, so the signal can't be gamed.",
          "The result is a verdict — READY, ALMOST THERE, BUILD FIRST, or NOT YET — plus a full breakdown of exactly why. Not a mysterious number. An accounting.",
        ],
      },
      {
        heading: "What it deliberately doesn't do",
        paragraphs: [
          "It doesn't tell you to buy, sell, or invest. It doesn't function as a lender, broker, advisor, or agent, and it isn't trying to. It gives you an honest, explainable position — where you stand today, and what specifically would move that position — and leaves the decision where it belongs, with you.",
        ],
      },
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getAllPostSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug);
}
