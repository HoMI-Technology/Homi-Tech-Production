/**
 * Static content module for the marketing Guides hub and per-guide pages.
 * Plain data — no fetches, no client state. Body content is structured as
 * an ordered list of sections (heading + paragraphs) so pages can render
 * consistent typography without parsing markdown.
 */

export interface GuideSection {
  heading: string;
  paragraphs: string[];
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  sections: GuideSection[];
}

export const GUIDES: Guide[] = [
  {
    slug: "afford-is-not-ready",
    title: "Afford Is Not the Same as Ready",
    description:
      "Approval answers whether someone will fund the commitment. Readiness asks whether you’ll be okay after. Those are different questions — and confusing them is expensive.",
    sections: [
      {
        heading: "Two questions that get collapsed into one",
        paragraphs: [
          "When people say “I can afford it,” they often mean one of three different things: a bank might lend against it, the payment fits in a spreadsheet this month, or life still feels livable after the commitment. Only the third is readiness. The first is underwriting. The second is cash-flow theater. Collapsing them is how people end up house-poor without ever missing a payment.",
          "Credit scores and pre-approvals do important work. They were never designed to answer “will you be okay?” HōMI exists for that second question — as educational guidance, not as a lender, broker, or credit-score replacement.",
        ],
      },
      {
        heading: "What “afford” usually measures",
        paragraphs: [
          "Afford, in market language, is mostly structural: debt-to-income bands, payment-to-income ratios, reserves the underwriter wants to see. Those numbers protect the lender’s risk. They do not automatically protect your margin for a bad month, a job change, a repair, or the emotional cost of feeling trapped in a decision you rushed.",
          "A maximum approval figure is especially dangerous when treated as a target. The bank’s ceiling is not your goal line. Treating it like one is one of the most common paths to a life that looks fine on paper and feels tight every week.",
        ],
      },
      {
        heading: "What “ready” actually requires",
        paragraphs: [
          "Readiness is three lenses at once. Financial Reality asks what the numbers can support without fantasy. Emotional Truth asks what still feels honest when the pressure drops. Perfect Timing asks whether now is your window — or whether waiting is the wiser move. Any one lens alone is incomplete.",
          "That is why “not yet” and “Build First” are not failures. They are protective maps. They name the gap without shame and point at the next build action instead of forcing a commitment you will regret.",
        ],
      },
      {
        heading: "A simple test before you escalate",
        paragraphs: [
          "Ask out loud: If this closed tomorrow, would I still be okay — financially, emotionally, and in the life I’m actually living — not the life the listing photos sell? If the honest answer is “I’m not sure,” that uncertainty is data. It is not weakness.",
          "You do not need HōMI’s permission to wait. You may want a calmer, structured read across all three pillars before someone with a stake in the sale sets the tempo. Ninety seconds of honesty beats ninety days of quiet regret.",
        ],
      },
    ],
  },
  {
    slug: "am-i-ready-to-buy-a-house",
    title: "Am I Ready to Buy a House? The Full Readiness Check",
    description:
      "Ready is a different question than afford or approved. A three-pillar self-check — Financial Reality, Emotional Truth, Perfect Timing — plus the signs the honest answer is “not yet,” and why that answer protects you.",
    sections: [
      {
        heading: "The question behind the question",
        paragraphs: [
          "When you type “am I ready to buy a house,” most of what comes back answers a different question: whether a lender would fund you, what a payment calculator says, which loan program fits. Useful — and beside the point. Approval is the lender’s question about their risk. Readiness is your question about your life: after the keys, the closing costs, and the first surprise repair, will you be okay?",
          "Readiness is not one number. It is three honest reads taken together — Financial Reality, Emotional Truth, and Perfect Timing — and it moves. You can be unready in March and ready in November. The point of checking is not to earn a purchase. It is to find out which one you are in, before someone with a stake in the sale sets the tempo.",
        ],
      },
      {
        heading: "The Financial Reality check",
        paragraphs: [
          "Start with carrying, not qualifying. The bank’s ceiling is the most they will lend, not the most your life can hold. Run the full monthly cost — payment, taxes, insurance, maintenance you’re now responsible for — against your real income, and notice what’s left for everything you currently do. If the honest answer is “nothing,” the house owns you, not the reverse.",
          "Then look at what protects you when something breaks: months of essential expenses set aside, separate from the down payment. Buyers pour everything into the down payment and arrive at ownership with no shock absorber — which is exactly when ownership starts throwing shocks. Debt load and credit standing matter too, but as a matter of degree; a few conditions are serious enough that the protective answer is a hard stop, and pretending otherwise helps no one.",
        ],
      },
      {
        heading: "The Emotional Truth check",
        paragraphs: [
          "Now the part spreadsheets skip, weighed here with the same seriousness as the math. Whose deadline is this? A lease ending, a market headline, a family member’s timeline, an agent’s urgency — none of those are your readiness. Pressure borrowed from someone else is the most common reason good numbers still turn into regret.",
          "Ask what stays true when the pressure drops. Do you and anyone deciding with you actually agree — on the money, the place, the timing? Does the want survive a quiet week, or does it only exist in the listing photos? Hesitation isn’t weakness; it’s data. A gut that keeps flagging the same doubt is telling you which pillar to go look at.",
        ],
      },
      {
        heading: "The Perfect Timing check",
        paragraphs: [
          "Timing the market is a game even professionals lose. Timing your life is a question you can actually answer. Is your income settling or shifting? Is the next two years legible — or is a move, a career change, a family change plausibly in it? A great house at a bad moment in your life is a bad decision wearing good staging.",
          "Waiting has a cost, and so does rushing; the difference is that rushing’s costs compound and arrive uninvited. If your window is genuinely open — steady income, funded runway, aligned people, a horizon you trust — timing favors you. If it isn’t, the market will still be there when you are.",
        ],
      },
      {
        heading: "Signs the honest answer is “not yet”",
        paragraphs: [
          "Some tells recur: the down payment empties every account. The payment only works in the optimistic version of your budget. You’re deciding on someone else’s clock. You and your partner are answering these questions differently. You haven’t stress-tested a single bad month. None of these mean never. Each one names a gap that can be built.",
          "That is the reframe that changes the whole decision: not yet is not no. It is clarity, and it is protection. Build First is not failure — it is the map. The buyers who wait a season to close a specific gap are not behind; they are the ones who get to enjoy the house they eventually buy.",
        ],
      },
      {
        heading: "Getting a structured answer",
        paragraphs: [
          "You can run this check informally with the questions above — honestly asked, they will get you most of the way. If you want a structured read, HōMI’s assessment walks all three pillars and returns a Decision Readiness Score with a verdict and the specific gaps to build first. It is free, it is educational guidance rather than advice or approval, and no part of it earns anything from what you decide.",
          "Either way, the standard stays the same: being able to afford something is not the same as being ready to buy it. Answer the readiness question first, and every later question — lender, agent, offer — gets easier and safer.",
        ],
      },
    ],
  },
  {
    slug: "what-homi-is-not",
    title: "What HōMI Is — and Isn’t",
    description:
      "A Decision Companion for Decision Readiness. Not a lender, not a credit score, not a hype machine. Clear bright lines so you know what you’re using.",
    sections: [
      {
        heading: "What HōMI is",
        paragraphs: [
          "HōMI is a Decision Companion: a Decision Readiness Intelligence layer that helps you see whether you’ll be okay after a major commitment — starting with home-buying as the wedge, with the same honesty applied to other money decisions over time.",
          "The product reads three pillars together: Financial Reality, Emotional Truth, and Perfect Timing. The output is educational guidance — a readiness signal and a map (including Build First and not yet), not an order to buy and not an approval.",
        ],
      },
      {
        heading: "What HōMI is not",
        paragraphs: [
          "HōMI is not a lender, mortgage broker, real-estate agent, credit bureau, or financial advisor. We do not pre-approve, pre-qualify, underwrite, or guarantee outcomes. We do not replace a credit score. We do not take affiliate or referral fees from lenders — zero-affiliate is doctrine, not a slogan.",
          "If you need a loan offer, a rate lock, or a legal opinion, you need a licensed professional for that job. If you need clarity before that pressure, you are in the right place.",
        ],
      },
      {
        heading: "Language we refuse",
        paragraphs: [
          // brand-ok: explicit prohibition — listing what we do NOT say, not making these claims
          `You will not hear us claim you are \u201capproved,\u201d \u201cguaranteed,\u201d or that we \u201cunlock your dream home.\u201d We will not cosplay as a bank or invent urgency from market headlines. \u201cKnow When You\u2019re Ready\u201d means permission to wait when waiting is wise \u2014 not FOMO dressed as product.`, // brand-ok: prohibition statement lists what we refuse to say
          "If any marketing, partner, or rep ever blurs that line, treat it as a bug. The bright lines are public on purpose: educational guidance only; not a lender; not a credit score replacement.",
        ],
      },
      {
        heading: "How to use it well",
        paragraphs: [
          "Start with a calm assessment. Read the verdict as a map, not a grade. If the signal is Build First or not yet, use the path tools to close the real gap. If you are ready, you still talk to humans who underwrite and advise — HōMI does not replace them.",
          "Bring curiosity, not performance. The product works when you tell the truth about money, feeling, and timing — especially the parts that are inconvenient.",
        ],
      },
    ],
  },
  {
    slug: "the-real-cost-of-waiting-vs-rushing",
    title: "The Real Cost of Waiting vs. Rushing",
    description:
      "Both waiting too long and moving too fast carry a price. Here's how to tell which one you're actually paying.",
    sections: [
      {
        heading: "Two different regrets",
        paragraphs: [
          "Most people don't regret what they bought. They regret when they bought it. That single sentence explains more about financial unhappiness than any spreadsheet ever will. The house was fine. The timing wasn't.",
          "There are two ways to get the timing wrong, and they feel completely different from the inside. Rushing feels like adrenaline — a good deal, a ticking clock, a fear of missing out. Waiting feels like nothing at all, which is exactly why it's so easy to do indefinitely. Both cost money. Only one of them feels like a decision while it's happening.",
        ],
      },
      {
        heading: "What rushing actually costs",
        paragraphs: [
          "Rushing shows up in the numbers you don't see until later: the inspection contingency you waived to compete, the rate you locked because you were scared it would rise, the emergency fund you drained for a down payment that left no cushion for the first repair. None of this is hypothetical — it is the median experience of buyers who moved on a deadline that belonged to someone else, not to them.",
          "The tell is usually pressure. If the reason you're moving now is a market headline, a friend's timeline, or a listing agent's urgency, that's external pressure doing the deciding for you. HōMI measures this directly as part of Emotional Truth, because pressure that isn't yours predicts regret as reliably as a bad interest rate does.",
        ],
      },
      {
        heading: "What waiting actually costs",
        paragraphs: [
          "Waiting is quieter, so it's easier to underestimate. Rent paid with nothing built. Years of the same income growth you'd have had either way, except now with a higher price attached to the same home. Waiting past readiness isn't caution — it's just a different kind of cost, one that doesn't announce itself with a monthly statement.",
          "The distinction that matters is waiting past readiness versus waiting toward it. If your Perfect Timing score is climbing — savings rate improving, down payment progress building, horizon getting clearer — that's not stalling. That's the plan working. Waiting with no plan and no movement is the version that actually costs you.",
        ],
      },
      {
        heading: "How to tell which one you're doing",
        paragraphs: [
          "Ask three questions honestly. Can you afford it without stripping your safety net to zero? Do you actually want this, independent of anyone else's clock? Is this genuinely the right moment in your life, not just the right moment in the market? If all three are true, moving isn't rushing — it's readiness. If any of them is false and you're moving anyway, that's rushing, whatever the market is doing.",
          "If none of them are true yet and you're not moving, that's not failure — that's the score reflecting reality. The question that actually matters isn't \"how long has it been.\" It's whether the picture is getting clearer or staying stuck. HōMI exists to answer that question honestly, on a 90-second read, before either kind of cost gets locked in.",
        ],
      },
    ],
  },
  {
    slug: "how-much-house-you-can-actually-afford",
    title: "How Much House You Can Actually Afford",
    description:
      "The bank's number and your number are not the same number. Here's the difference, and why it matters more than the pre-qualification letter.",
    sections: [
      {
        heading: "The number a lender gives you isn't the number you should use",
        paragraphs: [
          "A lender's job is to determine the maximum they can safely lend you, not the amount you can comfortably live with. Those are different calculations aimed at different risks. The bank is protecting itself against default. Nobody in that chain is protecting you against a decade of feeling stretched thin in a home you technically qualified for.",
          "This is the core of why HōMI exists: banks profit from speed, and the number they hand you is optimized for their approval process, not your actual margin. Treating a maximum-approval figure as a target is one of the most common ways people end up house-poor without ever missing a payment.",
        ],
      },
      {
        heading: "Debt-to-income is the floor, not the ceiling",
        paragraphs: [
          "Debt-to-income ratio — your monthly debt payments divided by your gross monthly income — is the first filter any lender applies. Ratios at or below 28% tend to leave real breathing room. Between 28% and 36% is manageable but tighter. Above 43%, lenders themselves start hesitating, and above 50% is a hard line: it leaves almost no margin for a job change, a medical bill, or a bad month.",
          "The math only tells you what's structurally survivable. It says nothing about whether you'll enjoy the life that comes with that ratio. That second question is yours to answer, and it's usually the one people skip.",
        ],
      },
      {
        heading: "The housing-ratio line that actually matters",
        paragraphs: [
          "A separate ratio worth tracking closely is your total monthly housing cost — principal, interest, taxes, insurance, and HOA dues — as a share of gross monthly income. When that share climbs high enough, the math stops being about comfort and starts being about risk: one bad month no longer dents your budget, it threatens the roof over your head.",
          "This is one of the few places HōMI draws a firm line. When housing costs leave no room to breathe, the verdict turns protective regardless of how strong the rest of the picture looks, because no amount of emotional readiness offsets that exposure. We don't publish the exact line, so the signal can't be gamed.",
        ],
      },
      {
        heading: "What down payment and emergency fund actually protect",
        paragraphs: [
          "A very small down payment isn't just a bigger loan — it's thinner equity, which means a soft market or a rushed sale in year two can leave you owing more than the home is worth. Twenty percent down remains the clearest marker of a purchase with real margin, but it's not a magic number; it's a proxy for discipline and cushion.",
          "The emergency fund matters just as much as the down payment, and it's the one buyers most often ignore. Six months of expenses set aside, separate from the down payment, is what actually protects you once you own the surprises that come with ownership — the water heater, the roof, the year the property taxes jump. At the thin end, a single repair can start a debt spiral — and when there's essentially nothing set aside, HōMI stops treating it as a warning at all. The verdict turns protective, and the exact floor stays unpublished so it can't be gamed.",
        ],
      },
      {
        heading: "The number to actually use",
        paragraphs: [
          "Take the lender's maximum, then build your own number backward from what you want your life to feel like after the purchase — the trips you still want to take, the savings rate you still want to hit, the buffer you want for the year something breaks. That number is almost always lower than the approval letter. It's also the only number that predicts whether you'll still like this decision in five years.",
        ],
      },
    ],
  },
  {
    slug: "emergency-runway-before-everything",
    title: "Emergency Runway Before Everything",
    description:
      "Runway is the least exciting part of readiness and the most protective. Here's why HōMI treats it as a hard-stop, not a suggestion.",
    sections: [
      {
        heading: "Runway is not a savings goal — it's a floor",
        paragraphs: [
          "Emergency runway is the number of months you could cover your essential expenses if your income stopped tomorrow. It's separate from your down payment, separate from retirement savings, and separate from any investment plan. Its only job is to exist between you and a crisis.",
          "This is the single factor most likely to get sacrificed under pressure. When a down payment feels just out of reach, the emergency fund is the first place people quietly borrow from — and it's the decision most likely to turn a home purchase into a source of chronic stress instead of stability.",
        ],
      },
      {
        heading: "Why HōMI won't let this one slide",
        paragraphs: [
          "Most factors in the Decision Readiness Score are a matter of degree — more is better, less is worse, but nothing is disqualifying on its own. Runway is different. When there is essentially nothing set aside, the verdict turns fully protective regardless of every other number in the assessment, because owning a home means owning its surprises, and there is no version of financial readiness that works without a cushion under it. The exact floor is one of the red lines we keep private, so the signal can't be gamed.",
          "This isn't a penalty. It's the same logic as a building code: some lines exist because the failure mode behind them is severe enough that no other strength compensates for it. A high income and strong credit don't protect you from an emergency if there's nothing set aside to absorb it.",
        ],
      },
      {
        heading: "What counts as runway, and what doesn't",
        paragraphs: [
          "Real runway is liquid and accessible without penalty — a savings account, not a retirement account you'd pay a penalty and taxes to touch. It should be sized against your actual essential expenses, not your current spending, since a job loss usually means the discretionary spending disappears anyway.",
          "Three to six months is the range that gives most people real protection. Below three months, a single bad stretch — a layoff, a medical issue, a major repair — can force decisions made from panic instead of clarity. Above six months starts trading off against other goals with diminishing protective value, though there's no penalty for having more.",
        ],
      },
      {
        heading: "Building runway before you build anything else",
        paragraphs: [
          "If your runway is thin, it belongs at the top of your Build First plan, ahead of the down payment itself. A slightly smaller down payment with real runway underneath it is a stronger position than a larger down payment with nothing left over. Lenders will approve either. Only one of them protects you after closing.",
          "The clearest sign your runway-building is working isn't the total — it's the trend. A savings rate that's consistently funding the runway account, even slowly, is the strongest timing signal there is. Perfect Timing isn't about hitting a number by a deadline. It's about the direction things are actually moving.",
        ],
      },
    ],
  },
  {
    slug: "reading-your-emotional-signals",
    title: "Reading Your Emotional Signals",
    description:
      "Confidence, pressure, and alignment aren't soft factors. They predict regret as reliably as any ratio does. Here's how to read them honestly.",
    sections: [
      {
        heading: "Your gut is part of the math here",
        paragraphs: [
          "Emotional Truth is measured with the same seriousness as Financial Reality in the Decision Readiness Score, and that surprises people the first time they see it. It shouldn't. Confidence, alignment, and pressure predict whether someone regrets a major decision at least as reliably as debt-to-income ratios predict whether they can make the payment.",
          'Most financial tools treat feelings as noise to filter out before getting to the "real" numbers. HōMI treats them as their own category of signal, measured with the same seriousness as the spreadsheet, because a financially sound decision made for the wrong emotional reasons still produces regret.',
        ],
      },
      {
        heading: "Confidence: built on evidence, or built on hope?",
        paragraphs: [
          "Confidence sounds simple to self-report, but the honest version requires a follow-up question: confident because of what, exactly? Confidence built on a track record — you've saved consistently, you understand the numbers, you've thought through the tradeoffs — tends to hold up under stress. Confidence built on hope — this will probably work out, everyone says now is the time — tends to evaporate the first time something goes wrong.",
          "When you rate your own confidence honestly, separate the feeling from its source. A lower number backed by real reasoning is a better sign than a high number you can't explain.",
        ],
      },
      {
        heading: "Alignment: is everyone actually pointed the same way?",
        paragraphs: [
          "If a decision involves anyone besides you — a partner, a family, a co-signer — alignment is not a courtesy conversation. It's a load-bearing part of the decision. Two people who haven't actually discussed the tradeoffs, only the destination, often discover the misalignment after closing, when it's expensive to fix.",
          "The honest version of this question isn't \"does my partner support this?\" It's \"have we actually disagreed about anything in this and worked it through, or have we avoided the hard parts because the excitement was more comfortable?\" Avoided disagreement isn't alignment. It's a delay.",
        ],
      },
      {
        heading: "Pressure: whose deadline is this, really?",
        paragraphs: [
          "External pressure is the emotional signal most likely to be invisible while it's happening. A listing agent's urgency, a rising-rate headline, a friend's announcement — none of these are your timeline, but they can feel like it in the moment. HōMI measures this as an inverted factor on purpose: the higher your reported pressure, the more it counts against readiness, because pressure that isn't yours is one of the strongest predictors of a decision you'll second-guess later.",
          "A useful test: if the exact same opportunity existed with no deadline attached, would you still want it just as much? If the urgency is the only thing making it feel necessary, that's pressure talking, not readiness.",
        ],
      },
      {
        heading: "Reading the signals without shame",
        paragraphs: [
          "None of this is about being emotionally deficient if your numbers are lower than you'd like. It's about seeing clearly instead of guessing. A low emotional-truth reading isn't a character flaw — it's information, the same as a low down payment. Both are things you can build. The only mistake is not looking.",
        ],
      },
    ],
  },
  {
    slug: "the-620-line-credit-before-keys",
    title: "The 620 Line: Credit Before Keys",
    description:
      "Why credit priced as high-risk changes the whole readiness picture — and what actually moves the number in the months before you need it.",
    sections: [
      {
        heading: "Why 620 specifically",
        paragraphs: [
          "620 is roughly where conventional mortgage pricing starts to shift meaningfully against you. Below it, the loans available narrow, the rates offered climb, and the total interest cost over the life of the loan can grow large enough to undo the value of the purchase itself. This isn't an arbitrary number — it's the point where the math genuinely changes.",
          "That's why credit priced as high-risk is a protective line for HōMI rather than a small deduction — and why we keep the exact line private, so it can't be gamed. A strong down payment and healthy emergency fund don't offset a credit score that will make the loan itself expensive for the next 15 to 30 years. Building credit first protects you from paying for years to skip a step that takes months to fix.",
        ],
      },
      {
        heading: "What the score is actually measuring",
        paragraphs: [
          "Credit scores are a proxy for how consistently you've handled debt over time — payment history, utilization, length of history, and the mix of account types. None of that is about whether you're a good or bad person with money. It's a mechanical read on repayment behavior, and mechanical reads can be moved mechanically.",
          "The single largest lever is payment history: on-time payments, consistently, over months. There's no shortcut that replaces this, but there's also no mystery to it. It responds directly and predictably to what you do next.",
        ],
      },
      {
        heading: "What actually moves the number before you need it",
        paragraphs: [
          "Utilization — the share of your available credit currently in use — is the second-largest lever, and it moves faster than payment history. Getting revolving balances under 30% of the limit, and ideally under 10%, can move a score meaningfully within one to two billing cycles, far faster than most people expect.",
          "Avoid opening new accounts in the months before applying for a mortgage; each inquiry and each new account temporarily lowers the average age of your credit history, which works against you at exactly the moment you need the opposite. Dispute any reporting errors directly with the credit bureaus — errors are more common than people assume, and they're one of the few fixes that can move a score without requiring months of new behavior.",
        ],
      },
      {
        heading: "The timeline that's realistic",
        paragraphs: [
          "Meaningful score movement is a three-to-twelve month project, not a weekend one. If you're near the 620 line, treat credit as the first item in your Build First plan, ahead of the down payment itself — a stronger score changes the rate you're offered on whatever loan size you end up with, which changes the total cost more than almost any other single factor.",
          "The goal isn't a perfect score. It's clearing the line by enough margin that the rate you're offered reflects your actual reliability, not a risk premium for a number that hadn't caught up yet.",
        ],
      },
    ],
  },
  {
    slug: "timing-the-market-vs-timing-your-life",
    title: "Timing the Market vs. Timing Your Life",
    description:
      "Everyone obsesses over rates and market cycles. Almost no one asks whether their own life is actually ready for the decision. Here's why the second question matters more.",
    sections: [
      {
        heading: "The wrong question everyone is asking",
        paragraphs: [
          "\"Is now a good time to buy?\" is almost always asked about the market — rates, inventory, whether prices will dip next quarter. It's a reasonable question and an almost unanswerable one; nobody reliably times a market, and the people claiming to are usually selling something. It's also, more importantly, the wrong question to be centering.",
          "The market's timing and your timing are two different clocks, and only one of them is something you can actually know. You cannot know where rates go next year. You can know whether your job feels stable, whether your relationship is aligned, whether your savings rate is climbing, and whether you're being rushed by something that isn't yours. That second clock is the one HōMI is built to read.",
        ],
      },
      {
        heading: "What life-timing actually includes",
        paragraphs: [
          "Perfect Timing, in the Decision Readiness Score, isn't about predicting the market. It's about your horizon, your savings trajectory, and your progress toward your own goal. A longer, clearer horizon gives the other two pillars — Financial Reality and Emotional Truth — time to actually catch up, instead of forcing a decision on a schedule set by external pressure.",
          "Savings rate matters more than savings total, because it's the clearest evidence of direction. Someone with a modest total but a strong, consistent savings rate is moving toward readiness faster than someone with a larger total but a flat or declining rate. Momentum is the signal, not the snapshot.",
        ],
      },
      {
        heading: "Why market-timing anxiety makes decisions worse, not better",
        paragraphs: [
          'Trying to time the market usually manufactures the exact pressure that undermines good decisions. "Rates might go up next month" and "prices might never be this low again" are both framings designed to create urgency, and urgency is the enemy of the emotional-truth pillar specifically. A decision made to beat a headline is a decision made on someone else\'s clock.',
          "This doesn't mean market conditions are irrelevant — they affect what you can afford and what a given number of dollars will get you. It means the market shouldn't be the deciding factor when your own readiness isn't there yet, and it shouldn't be the excuse for rushing when it is.",
        ],
      },
      {
        heading: "The question that actually predicts regret",
        paragraphs: [
          "The most reliable predictor of long-term satisfaction with a major purchase isn't what the market did afterward. It's whether the decision matched where the person's life actually was at the time — financially, emotionally, and in terms of timing they controlled rather than timing imposed on them.",
          "Most people don't regret what they bought. They regret when they bought it. \"When\" is rarely a market question. It's almost always a life question, and it's the one worth answering honestly before the market question even comes up.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function getAllGuideSlugs(): string[] {
  return GUIDES.map((g) => g.slug);
}
