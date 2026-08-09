/**
 * Money · Decide — the lens suite.
 *
 * Ported from the local planner build's Tools surface: a flat card grid where
 * selecting a lens expands it *inline*, pre-filled from the money picture,
 * rather than navigating away. The previous version here was a hub of links
 * out to /tools/*; those URLs still exist for the public funnel (a spec
 * non-goal to remove them) and the lenses without an inline panel yet are
 * linked at the foot of this page so no capability is lost.
 *
 * Animation is enter-only. `AnimatePresence mode="wait"` wedges under rAF
 * throttling in background tabs, which strands the panel mid-transition.
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Home,
  Scale,
  RefreshCw,
  Landmark,
  Layers,
  Flame,
  Activity,
  Target,
  Wallet,
  PiggyBank,
  Receipt,
  TrendingUp,
  Timer,
  EyeOff,
} from "lucide-react";
import { COLORS } from "@/lib/brand";
import { LENSES } from "@/lib/tools/registry";
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
import {
  ClosingCostPanel,
  DownPaymentPanel,
  RentVsBuyPanel,
  RunwayPanel,
} from "@/components/tools/Pass1Panels";
import type { LedgerSeeds } from "@/components/tools/seeds";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** The lenses that render inline here. Order matches the local build. */
const PANEL_IDS = [
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
  "runway",
  "down-payment",
  "rent-vs-buy",
  "closing-cost",
] as const;

type PanelId = (typeof PANEL_IDS)[number];

const ICONS: Record<PanelId, typeof Home> = {
  affordability: Home,
  "apr-compare": Scale,
  refinance: RefreshCw,
  heloc: Landmark,
  "loan-programs": Layers,
  "debt-payoff": Flame,
  "monte-carlo": Activity,
  fire: Target,
  "roth-conversion": Wallet,
  "blind-budget": EyeOff,
  runway: Timer,
  "down-payment": PiggyBank,
  "rent-vs-buy": TrendingUp,
  "closing-cost": Receipt,
};

/**
 * Closing cost has no /tools route in this repo, so its card copy lives here.
 * Every other card reads from the lens registry — one source of truth.
 */
const CLOSING_COST = {
  id: "closing-cost",
  name: "Closing Cost Range",
  desc: "Illustrative 2%–5% band of purchase price — not a lender quote.",
  accent: COLORS.amber,
};

function ActivePanel({ id, seeds, desc }: { id: PanelId; seeds: LedgerSeeds; desc: string }) {
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
    case "runway":
      return <RunwayPanel seeds={seeds} desc={desc} />;
    case "down-payment":
      return <DownPaymentPanel seeds={seeds} desc={desc} />;
    case "rent-vs-buy":
      return <RentVsBuyPanel seeds={seeds} desc={desc} />;
    case "closing-cost":
      return <ClosingCostPanel seeds={seeds} desc={desc} />;
  }
}

export function MoneyDecideHub() {
  const { seeds } = useLedgerSeeds();
  const [active, setActive] = useState<PanelId>("affordability");

  const cards = useMemo(
    () =>
      PANEL_IDS.map((id) => {
        if (id === "closing-cost") return CLOSING_COST;
        const lens = LENSES.find((l) => l.id === id);
        return {
          id,
          name: lens?.name ?? id,
          desc: lens?.desc ?? "",
          accent: lens?.accent ?? COLORS.cyan,
        };
      }),
    [],
  );

  /** Lenses that still live only as their own page. */
  const linkedLenses = useMemo(
    () => LENSES.filter((l) => !PANEL_IDS.includes(l.id as PanelId)),
    [],
  );

  const activeCard = cards.find((c) => c.id === active) ?? cards[0];

  return (
    <div>
      {/* No page header or lede here. MoneyShell already renders the eyebrow,
       * the h1 and the Stand/Track/Plan/Decide nav, PageFrame already supplies
       * the max-w-6xl container and spacing, and each panel restates its own
       * lens description. Adding any of it back stacks two headers, nests two
       * containers, and stacks three blocks of prose ahead of the lenses — the
       * exact thing #173 cleaned up. Cards come first. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((tool, i) => {
          const Icon = ICONS[tool.id as PanelId];
          const selected = tool.id === active;
          return (
            <motion.button
              key={tool.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03, ease: EASE }}
              onClick={() => setActive(tool.id as PanelId)}
              aria-pressed={selected}
              className="group flex flex-col rounded-2xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
              style={{
                borderColor: selected ? `${tool.accent}59` : "rgba(255,255,255,0.06)",
                backgroundColor: selected ? `${tool.accent}0d` : "rgba(30,41,59,0.6)",
              }}
            >
              <span className="flex items-center justify-between">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${tool.accent}1a`, color: tool.accent }}
                >
                  <Icon size={15} aria-hidden />
                </span>
                <ChevronRight
                  size={14}
                  aria-hidden
                  className="text-dim transition-transform group-hover:translate-x-0.5"
                  style={selected ? { color: tool.accent, transform: "rotate(90deg)" } : undefined}
                />
              </span>
              <span className="mt-3 text-sm font-bold text-light">{tool.name}</span>
              <span className="mt-1 text-xs leading-snug text-dim">{tool.desc}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5">
        {/* Keyed so switching lenses remounts and replays the enter animation. */}
        <motion.div
          key={active}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: EASE }}
        >
          <ActivePanel id={active} seeds={seeds} desc={activeCard.desc} />
        </motion.div>
      </div>

      {linkedLenses.length > 0 && (
        <section className="mt-10" aria-labelledby="decide-more">
          <h2 id="decide-more" className="eyebrow text-dim">
            More lenses
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {linkedLenses.map((lens) => (
              <Link
                key={lens.id}
                href={lens.path}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-dim transition-colors hover:border-cyan/30 hover:text-light"
              >
                {lens.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 max-w-2xl text-xs leading-relaxed text-dim/70">
        HōMI lenses are educational. They do not provide financial, tax, mortgage, or investment
        advice. Confirm critical numbers with qualified professionals before you act.
      </p>
    </div>
  );
}
