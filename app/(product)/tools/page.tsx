import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools | HōMI",
  description: "Honest calculators for the math behind your biggest decisions.",
};

const TOOLS = [
  {
    href: "/tools/affordability",
    name: "Affordability",
    desc: "What you can actually afford, at three levels of comfort — not just what a lender will approve.",
  },
  {
    href: "/tools/debt-payoff",
    name: "Debt Payoff",
    desc: "Avalanche vs. snowball, side by side, with the real interest cost of each.",
  },
  {
    href: "/tools/down-payment",
    name: "Down Payment Goal",
    desc: "How long it will actually take to reach your down payment, at your real savings rate.",
  },
  {
    href: "/tools/monte-carlo",
    name: "Monte Carlo Projection",
    desc: "1,000 simulated futures for your savings — because markets don't move in a straight line.",
  },
  {
    href: "/tools/rent-vs-buy",
    name: "Rent vs. Buy",
    desc: "A five-year cost comparison — the honest answer depends on timing, not just math.",
  },
  {
    href: "/tools/runway",
    name: "Emergency Runway",
    desc: "How many months your savings actually cover. Runway comes first.",
  },
  {
    href: "/tools/fire",
    name: "FIRE Number",
    desc: "What you'd need invested to live on withdrawals alone — plus whether you're already coasting there.",
  },
  {
    href: "/tools/mortgage",
    name: "Mortgage Payment",
    desc: "The full monthly payment broken into its real parts, plus the true cost of the loan over its life.",
  },
  {
    href: "/tools/roth-conversion",
    name: "Roth Conversion",
    desc: "An educational look at tax cost today versus tax avoided later. Not a recommendation to convert anything.",
  },
  {
    href: "/tools/blind-budget",
    name: "Blind Budget",
    desc: "Plan without knowing your exact numbers. Precision isn't required for honesty.",
  },
];

export default function ToolsHubPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl text-light">Tools</h1>
      <p className="mt-2 max-w-2xl text-dim">
        No hype, no black boxes — just the math behind the decisions that matter, laid out plainly.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="glass glass-hover flex flex-col gap-2 p-6">
            <h2 className="font-semibold text-light">{tool.name}</h2>
            <p className="text-sm leading-relaxed text-dim">{tool.desc}</p>
            <span className="mt-3 text-sm font-medium text-cyan">Open calculator →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
