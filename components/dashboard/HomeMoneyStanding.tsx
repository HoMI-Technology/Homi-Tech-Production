import Link from "next/link";
import { buildHomeMoneyStandingView } from "@/lib/dashboard/home-money-standing";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { formatCurrency } from "@/lib/tools/format";

/**
 * Home money standing — Path evidence only (runway, liquid, hard-stop flags).
 * Last AssessmentResult wins. No client ledger read. No 4xl surplus.
 * CTAs stay ghost/sm (see docs/MONEY-TOOLS-DEPTH.md).
 */
export function HomeMoneyStanding({
  lastMoney = null,
  hardStopFlags = [],
  bankLinked = null,
}: {
  lastMoney?: LastReadMoneyInputs | null;
  hardStopFlags?: string[];
  bankLinked?: boolean | null;
}) {
  const view = buildHomeMoneyStandingView({ lastMoney, hardStopFlags, bankLinked });
  const runwayDisplay =
    view.runwayMonths != null && Number.isFinite(view.runwayMonths)
      ? `${view.runwayMonths >= 10 ? view.runwayMonths.toFixed(0) : view.runwayMonths.toFixed(1)} mo`
      : "—";
  const liquidDisplay =
    view.liquidDollars != null ? formatCurrency(view.liquidDollars) : "—";

  return (
    <section
      className="mt-5 rounded-xl border border-white/8 bg-navy-light/40 px-4 py-4 sm:px-5"
      data-home-money-standing={view.status}
      aria-label="Money standing"
    >
      <p className="eyebrow">Money standing</p>

      <div className="money-data-strip mt-3 w-full" data-home-money-strip="">
        <div className="money-data-cell">
          <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-dim">Runway</p>
          <p className="score-numeral mt-1 text-lg text-light" data-home-money-runway="">
            {runwayDisplay}
          </p>
        </div>
        <div className="money-data-cell">
          <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-dim">Liquid</p>
          <p className="score-numeral mt-1 text-lg text-light" data-home-money-liquid="">
            {liquidDisplay}
          </p>
        </div>
      </div>

      {view.hardStopFlags.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-crimson" data-home-money-flags="">
          {view.hardStopFlags.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">{view.standingLine}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={view.primaryHref} className="btn btn-ghost btn-sm">
          {view.primaryLabel}
        </Link>
        <Link href={view.secondaryHref} className="btn btn-ghost btn-sm">
          {view.secondaryLabel}
        </Link>
      </div>
    </section>
  );
}
