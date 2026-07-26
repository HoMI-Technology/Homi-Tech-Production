import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Honest calculators for the math behind your biggest decisions — housing, runway, debt, and independence.",
  alternates: { canonical: "/tools" },
};

type ToolCard = {
  href: string;
  name: string;
  desc: string;
  accent?: string;
};

type ToolGroup = {
  id: string;
  title: string;
  subtitle: string;
  tools: ToolCard[];
};

const GROUPS: ToolGroup[] = [
  {
    id: "score",
    title: "Readiness",
    subtitle: "Same engine as the assessment — explore levers without a full retest.",
    tools: [
      {
        href: "/simulator",
        name: "Score Simulator",
        desc: "Move income, savings, and debt levers and watch readiness respond.",
        accent: "#22d3ee",
      },
    ],
  },
  {
    id: "housing",
    title: "Housing",
    subtitle: "What you can carry — not just what a lender will approve.",
    tools: [
      {
        href: "/tools/affordability",
        name: "Affordability",
        desc: "Three honest comfort tiers — protected, stretch, and red line.",
        accent: "#34d399",
      },
      {
        href: "/tools/mortgage",
        name: "Mortgage Payment",
        desc: "Full monthly payment parts plus true cost over the life of the loan.",
        accent: "#22d3ee",
      },
      {
        href: "/tools/rent-vs-buy",
        name: "Rent vs. Buy",
        desc: "Five-year cost comparison where timing matters as much as math.",
        accent: "#facc15",
      },
      {
        href: "/tools/down-payment",
        name: "Down Payment Goal",
        desc: "How long it really takes at your actual savings rate.",
        accent: "#22d3ee",
      },
      {
        href: "/tools/heloc",
        name: "Home Equity Line",
        desc: "Borrowable equity after combined loan-to-value caps — not paper equity.",
        accent: "#34d399",
      },
      {
        href: "/tools/refinance",
        name: "Refinance Break-Even",
        desc: "When payment savings repay closing costs — and if you’ll still be there.",
        accent: "#facc15",
      },
      {
        href: "/tools/apr-compare",
        name: "APR Comparison",
        desc: "Three offers ranked by cost-inclusive APR, not just the teaser rate.",
        accent: "#22d3ee",
      },
      {
        href: "/tools/loan-programs",
        name: "Loan Programs",
        desc: "Conventional vs FHA vs VA after down payment, MI, and upfront fees.",
        accent: "#34d399",
      },
    ],
  },
  {
    id: "stability",
    title: "Stability",
    subtitle: "Shock absorption before the leap.",
    tools: [
      {
        href: "/tools/runway",
        name: "Emergency Runway",
        desc: "Months of essentials your liquid savings actually cover.",
        accent: "#34d399",
      },
      {
        href: "/tools/debt-payoff",
        name: "Debt Payoff",
        desc: "Avalanche vs snowball side by side — interest cost, not slogans.",
        accent: "#fab633",
      },
      {
        href: "/tools/blind-budget",
        name: "Blind Budget",
        desc: "Plan honestly when exact numbers aren’t available yet.",
        accent: "#facc15",
      },
    ],
  },
  {
    id: "future",
    title: "Long horizon",
    subtitle: "Independence and path risk — educational, not advice.",
    tools: [
      {
        href: "/tools/fire",
        name: "FIRE Number",
        desc: "What you’d need invested to live on withdrawals — and coast progress.",
        accent: "#34d399",
      },
      {
        href: "/tools/monte-carlo",
        name: "Monte Carlo Projection",
        desc: "1,000 simulated futures — markets don’t move in a straight line.",
        accent: "#22d3ee",
      },
      {
        href: "/tools/roth-conversion",
        name: "Roth Conversion",
        desc: "Tax cost today versus tax avoided later. Not a recommendation.",
        accent: "#facc15",
      },
    ],
  },
];

export default function ToolsHubPage() {
  const count = GROUPS.reduce((n, g) => n + g.tools.length, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
      <p className="eyebrow">Decision math</p>
      <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">Tools</h1>
      <p className="mt-2 max-w-2xl text-dim">
        No hype, no black boxes — the math behind decisions that matter, laid out plainly.
        {` ${count} calculators.`} Educational guidance only.
      </p>

      <div className="mt-10 space-y-14">
        {GROUPS.map((group) => (
          <section key={group.id} aria-labelledby={`tools-${group.id}`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id={`tools-${group.id}`} className="font-display text-xl text-light">
                  {group.title}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-dim">{group.subtitle}</p>
              </div>
              <span className="score-numeral text-xs text-dim/70">
                {group.tools.length} tool{group.tools.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="glass glass-hover group relative flex flex-col overflow-hidden p-6 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-px"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${tool.accent ?? "#22d3ee"}88, transparent)`,
                    }}
                  />
                  <h3 className="font-semibold text-light group-hover:text-cyan">{tool.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-dim">{tool.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan">
                    Open calculator
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                      className="transition-transform group-hover:translate-x-0.5"
                    >
                      <path d="M2 8h11m0 0L9 4m4 4l-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-14 max-w-2xl text-xs leading-relaxed text-dim/70">
        HōMI tools are educational. They do not provide financial, tax, mortgage, or investment advice.
        Confirm critical numbers with qualified professionals before you act.
      </p>
    </div>
  );
}
