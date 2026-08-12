import type { ReactNode } from "react";
import { OperateInstrument } from "@/components/operate/OperateInstrument";
import { Sparkline } from "@/components/ui/Sparkline";
import {
  ENGINE_WEEK_POSTS,
  MARKETING_LOCK,
  buildUtmUrl,
  truncateLabel,
} from "@/lib/admin/marketing-command";
import { COLORS } from "@/lib/brand";

export type ActivationInstrumentProps = {
  /** Unique users with ≥1 completed assessment in the last 7 days. */
  uniqueActivated7d: number;
  /** Raw completion events in the last 7 days (can exceed unique users). */
  completions7d: number;
  accountsLast7: number;
  /** New accounts (7d) who completed at least once — cohort numerator. */
  cohortActivated7d: number;
  /** Honest cohort % or null when n is too small / zero. */
  cohortRate7d: number | null;
  /** True when sample is below MIN_COHORT_N so % is suppressed. */
  cohortRateSuppressed: boolean;
  activationSeries: { date: string; count: number }[];
  /** Compact UTM builder (client island) rendered under the engine rail. */
  utmSlot: ReactNode;
};

function instrumentTint(uniqueActivated7d: number, accountsLast7: number): string {
  if (uniqueActivated7d > 0) return COLORS.emerald;
  if (accountsLast7 > 0) return COLORS.amber;
  return COLORS.cyan;
}

/**
 * Signature hero for /admin/marketing — unique activated users 7d + engine + UTM.
 * Does not emit a page-level h1 (PageHeader owns that).
 */
export function ActivationInstrument({
  uniqueActivated7d,
  completions7d,
  accountsLast7,
  cohortActivated7d,
  cohortRate7d,
  cohortRateSuppressed,
  activationSeries,
  utmSlot,
}: ActivationInstrumentProps) {
  const tint = instrumentTint(uniqueActivated7d, accountsLast7);
  const icpChip = truncateLabel(MARKETING_LOCK.icp, 56);
  const claimLine = truncateLabel(MARKETING_LOCK.claimOneLiner, 80);

  return (
    <OperateInstrument tint={tint} className="mt-6">
      <p className="eyebrow">This week · LinkedIn engine</p>
      <div className="dash-hero-meta" role="group" aria-label="This week focus">
        <p className="font-display text-xl font-medium leading-tight tracking-tight text-light">
          Create activations
        </p>
        <p>
          Post the slate, tag every link, load email drafts — then prove the numbers below.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-3xs font-semibold text-light">
          {MARKETING_LOCK.channel}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-3xs font-semibold text-light">
          PH {MARKETING_LOCK.phThisQuarter}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-3xs font-semibold text-light">
          {MARKETING_LOCK.hoursPerWeek}
        </span>
        <span
          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-3xs font-semibold text-dim"
          title={MARKETING_LOCK.icp}
        >
          {icpChip}
        </span>
      </div>
      <p className="mt-2 truncate text-3xs text-dim" title={MARKETING_LOCK.claimOneLiner}>
        {claimLine}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
        <div>
          <p className="text-3xs font-semibold uppercase tracking-wide text-dim">
            Activated users · 7 days
          </p>
          <p
            className="score-numeral mt-1 text-5xl text-light sm:text-6xl"
            title="Unique users with at least one completed assessment in the last 7 days"
          >
            {uniqueActivated7d.toLocaleString()}
          </p>
          <p className="mt-2 text-sm text-dim">
            {completions7d.toLocaleString()} completion
            {completions7d === 1 ? "" : "s"}
            {completions7d !== uniqueActivated7d
              ? ` · ${uniqueActivated7d.toLocaleString()} unique`
              : ""}
          </p>
          <p className="mt-1 text-sm text-dim">
            Cohort: {cohortActivated7d.toLocaleString()} of {accountsLast7.toLocaleString()} new
            accounts activated
            {cohortRate7d !== null
              ? ` (${cohortRate7d}%)`
              : cohortRateSuppressed
                ? " (rate hidden — n under 5)"
                : ""}
          </p>
          {activationSeries.length >= 2 && (
            <div className="mt-4 w-full max-w-xs">
              <p className="mb-1 text-3xs text-dim">Unique activated / day</p>
              <Sparkline
                id="mk-instrument-activations"
                values={activationSeries.map((d) => d.count)}
                color={COLORS.emerald}
              />
            </div>
          )}
          <p className="mt-3 text-xs text-dim">
            North star: unique users who completed a readiness path — not completion spam, not
            followers.
          </p>
        </div>

        <div id="engine" className="scroll-mt-[calc(var(--nav-offset)+3.5rem)]">
          <p className="text-3xs font-semibold uppercase tracking-wide text-dim">
            LinkedIn slate
          </p>
          <ul className="mt-3 space-y-2">
            {ENGINE_WEEK_POSTS.map((p) => (
              <li
                key={p.campaign}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-light">
                    <span className="text-cyan">{p.day}</span> · {p.title}
                  </p>
                  <p className="mt-0.5 font-mono text-3xs text-dim">{p.campaign}</p>
                </div>
                <div className="flex gap-1.5">
                  <a
                    href={p.asset}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                  >
                    Asset
                  </a>
                  <a
                    href={buildUtmUrl({
                      path: "/assessment",
                      source: "linkedin",
                      medium: "social",
                      campaign: p.campaign,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                  >
                    UTM
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="/marketing/gtm/ENGINE-2-WEEKS.md"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan hover:underline"
            >
              2-week runbook
            </a>
            <span className="text-dim" aria-hidden>
              ·
            </span>
            <a
              href="/marketing/content/copy/CAPTIONS.md"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan hover:underline"
            >
              Captions
            </a>
          </div>

          <div
            id="utm-builder"
            className="mt-5 scroll-mt-[calc(var(--nav-offset)+3.5rem)] rounded-lg border border-white/10 bg-navy/40 p-3 sm:p-4"
          >
            <p className="text-3xs font-semibold uppercase tracking-wide text-dim">
              UTM link builder
            </p>
            <div className="mt-3">{utmSlot}</div>
          </div>
        </div>
      </div>
    </OperateInstrument>
  );
}
