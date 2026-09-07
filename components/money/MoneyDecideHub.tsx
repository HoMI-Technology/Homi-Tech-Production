/**
 * Money · Decide — supporting lens surface on live `/money/decide`.
 * Primary catalog is `/tools`. Educational estimates — never a score write.
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LENSES, hubLenses } from "@/lib/tools/registry";
import { useLedgerSeeds } from "@/components/tools/seeds";
import {
  AffordabilityPanel,
  AprPanel,
  HelocPanel,
  LoanProgramsPanel,
  RefinancePanel,
} from "@/components/tools/HousingPanels";
import { BlindBudgetPanel, DebtPayoffPanel } from "@/components/tools/StabilityPanels";
import { FirePanel, MonteCarloPanel, RothPanel } from "@/components/tools/TimingPanels";
import type { LedgerSeeds } from "@/components/tools/seeds";

const HUB_PANEL_IDS = [
  "affordability",
  "apr-compare",
  "refinance",
  "heloc",
  "loan-programs",
  "debt-payoff",
  "monte-carlo",
  "fire",
  "roth-conversion",
  "blind-budget",
] as const;

type HubPanelId = (typeof HUB_PANEL_IDS)[number];

function isHubPanelId(id: string): id is HubPanelId {
  return (HUB_PANEL_IDS as readonly string[]).includes(id);
}

function ActivePanel({ id, seeds, desc }: { id: HubPanelId; seeds: LedgerSeeds; desc: string }) {
  switch (id) {
    case "affordability":
      return <AffordabilityPanel seeds={seeds} desc={desc} />;
    case "apr-compare":
      return <AprPanel seeds={seeds} desc={desc} />;
    case "refinance":
      return <RefinancePanel seeds={seeds} desc={desc} />;
    case "heloc":
      return <HelocPanel seeds={seeds} desc={desc} />;
    case "loan-programs":
      return <LoanProgramsPanel seeds={seeds} desc={desc} />;
    case "debt-payoff":
      return <DebtPayoffPanel seeds={seeds} desc={desc} />;
    case "monte-carlo":
      return <MonteCarloPanel seeds={seeds} desc={desc} />;
    case "fire":
      return <FirePanel seeds={seeds} desc={desc} />;
    case "roth-conversion":
      return <RothPanel seeds={seeds} desc={desc} />;
    case "blind-budget":
      return <BlindBudgetPanel seeds={seeds} desc={desc} />;
    default: {
      const _exhaustive: never = id;
      void _exhaustive;
      return null;
    }
  }
}

export function MoneyDecideHub() {
  const { seeds } = useLedgerSeeds();
  const cards = useMemo(() => hubLenses(), []);
  const [active, setActive] = useState<string>(cards[0]?.id ?? "affordability");
  const activeCard = cards.find((c) => c.id === active) ?? cards[0];

  const deepLinks = useMemo(
    () =>
      LENSES.filter(
        (l) =>
          l.placement !== "hub" &&
          l.placement !== "hidden" &&
          l.placement !== "redirect" &&
          l.path.startsWith("/tools/"),
      ),
    [],
  );

  return (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-dim">
        Money · decide · supporting
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-light">Educational lenses</h1>
      <p className="mb-4 mt-3 max-w-xl text-sm leading-relaxed text-dim" data-money-job="decide" data-decide-honesty="">
        Answer one math question at a time. Educational estimates — not advice, and never a score
        write. Verdict unchanged, or a hard stop still on, until a new assessment. Primary catalog:{" "}
        <Link href="/tools" className="text-cyan underline-offset-2 hover:underline">
          /tools
        </Link>
        .
      </p>

      <ol className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
        {cards.map((tool) => {
          const selected = tool.id === active;
          return (
            <li key={tool.id}>
              <button
                type="button"
                onClick={() => setActive(tool.id)}
                aria-pressed={selected}
                className="flex w-full items-start justify-between gap-4 py-4 text-left"
              >
                <span>
                  <span className="block text-sm font-medium text-light">{tool.name}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-dim">{tool.desc}</span>
                </span>
                <span className={`shrink-0 pt-0.5 text-sm ${selected ? "text-cyan" : "text-dim"}`}>
                  {selected ? "Open lens" : "Open"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {activeCard && isHubPanelId(activeCard.id) && (
        <div className="mt-6" data-decide-active-lens={activeCard.id}>
          <p className="mb-3 text-xs leading-relaxed text-dim/80">
            Close language: this estimate does not write AssessmentResult. Verdict unchanged unless
            you reassess. A hard stop still on stays on.
          </p>
          <ActivePanel id={activeCard.id} seeds={seeds} desc={activeCard.desc} />
        </div>
      )}

      {deepLinks.length > 0 && (
        <section className="mt-10" aria-labelledby="decide-depth">
          <h2 id="decide-depth" className="text-2xs font-semibold uppercase tracking-[0.16em] text-dim">
            Depth links
          </h2>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {deepLinks.map((lens) => (
              <Link
                key={lens.id}
                href={lens.path}
                className="text-sm text-dim underline decoration-white/20 underline-offset-4 hover:text-light"
              >
                {lens.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 max-w-xl text-xs leading-relaxed text-dim/70">
        HōMI lenses are educational. They do not provide financial, tax, mortgage, or investment
        advice. Confirm critical numbers with qualified professionals before you act.
      </p>
    </div>
  );
}
