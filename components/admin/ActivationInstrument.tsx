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
  activationsLast7: number;
  accountsLast7: number;
  activationRate7d: number | null;
  activationSeries: { date: string; count: number }[];
  /** Compact UTM builder (client island) rendered under the engine rail. */
  utmSlot: ReactNode;
};

function instrumentTint(activationsLast7: number, accountsLast7: number): string {
  if (activationsLast7 > 0) return COLORS.emerald;
  if (accountsLast7 > 0) return COLORS.amber;
  return COLORS.cyan;
}

/**
 * Signature hero for /admin/marketing — activations 7d + LinkedIn engine + UTM.
 * Does not emit a page-level h1 (PageHeader owns that).
 */
export function ActivationInstrument({
  activationsLast7,
  accountsLast7,
  activationRate7d,
  activationSeries,
  utmSlot,
}: ActivationInstrumentProps) {
  const tint = instrumentTint(activationsLast7, accountsLast7);
  const icpChip = truncateLabel(MARKETING_LOCK.icp, 56);
  const claimLine = truncateLabel(MARKETING_LOCK.claimOneLiner, 80);

  return (
    <OperateInstrument tint={tint} className="mt-6">
      <p className="eyebrow">This week · LinkedIn engine</p>
      <div className="dash-hero-meta" role="group" aria-label="This week focus">
        <p className="font-display text-[clamp(1.35rem,2.4vw,1.85rem)] font-medium leading-tight tracking-tight text-light">
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
            Activations · 7 days
          </p>
          <p className="score-numeral mt-1 text-5xl text-light sm:text-6xl">
            {activationsLast7.toLocaleString()}
          </p>
          <p className="mt-2 text-sm text-dim">
            {accountsLast7.toLocaleString()} accounts → {activationsLast7.toLocaleString()}{" "}
            activations
            {activationRate7d !== null ? ` (${activationRate7d}%)` : ""}
          </p>
          {activationSeries.length >= 2 && (
            <div className="mt-4 w-full max-w-xs">
              <Sparkline
                id="mk-instrument-activations"
                values={activationSeries.map((d) => d.count)}
                color={COLORS.emerald}
              />
            </div>
          )}
          <p className="mt-3 text-xs text-dim">
            North star: completed readiness path — not followers.
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
