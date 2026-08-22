import type { ReactNode } from "react";
import { OperateInstrument } from "@/components/operate/OperateInstrument";
import { Sparkline } from "@/components/ui/Sparkline";
import {
  ENGINE_WEEK_POSTS,
  GROWTH_ENGINES,
  MARKETING_LOCK,
  buildUtmUrl,
  truncateLabel,
} from "@/lib/admin/marketing-command";
import { COLORS } from "@/lib/brand";

export type ActivationInstrumentProps = {
  /** Unique users activated in the last 7 days — the sole hero numeral. */
  activationsLast7: number;
  /** New accounts in the last 7 days (rate line denominator). */
  accountsLast7: number;
  /** Cohort activation rate % — null when suppressed (n below MIN_COHORT_N). */
  activationRate7d: number | null;
  /** Daily unique activated users, oldest → newest (30d sparkline). */
  activationSeries: { date: string; count: number }[];
  /** Compact UTM builder (client island) rendered under the engine rail. */
  utmSlot: ReactNode;
};

/** Mission chip limits locked in marketing-command-center-v2 (rev 3). */
const ICP_CHIP_MAX = 56;
const CLAIM_LINE_MAX = 80;

/**
 * Activation Instrument — the signature structure of /admin/marketing.
 * Score column owns the north star (activations 7d + 30d sparkline); the
 * engine rail + UTM builder sit right. Tint is dynamic per the locked spec:
 * emerald when activations landed, amber when accounts but no activations,
 * cyan when quiet. Waitlist / accounts / paid never appear here — they live
 * in the 3-cell MetricRail under the instrument.
 *
 * Title block intentionally renders no <h1> — the page's single h1 is the
 * PageHeader. Visual classes mirror OperateHeroMeta (.dash-hero-meta).
 */
export function ActivationInstrument({
  activationsLast7,
  accountsLast7,
  activationRate7d,
  activationSeries,
  utmSlot,
}: ActivationInstrumentProps) {
  const tint =
    activationsLast7 > 0
      ? COLORS.emerald
      : accountsLast7 > 0
        ? COLORS.amber
        : COLORS.cyan;

  const chips = [
    { label: MARKETING_LOCK.channel, title: MARKETING_LOCK.channel },
    { label: `PH ${MARKETING_LOCK.phThisQuarter}`, title: "Product Hunt this quarter" },
    { label: MARKETING_LOCK.hoursPerWeek, title: "Founder hours per week" },
    {
      label: truncateLabel(MARKETING_LOCK.icp, ICP_CHIP_MAX),
      title: MARKETING_LOCK.icp,
    },
  ];
  const claimLine = truncateLabel(MARKETING_LOCK.claimOneLiner, CLAIM_LINE_MAX);
  const sparkValues = activationSeries.map((d) => d.count);

  return (
    <OperateInstrument tint={tint} className="mt-6">
      <p className="eyebrow">This week · X + TikTok engine</p>
      <div className="dash-hero-meta" role="group" aria-label="This week focus">
        <p className="font-display text-xl font-medium leading-tight tracking-tight text-light">
          Create activations
        </p>
        <p>
          Post the slate, tag every link, load email drafts — then prove the numbers below.
        </p>
      </div>

      {/* Mission chips — single flex wrap row, from MARKETING_LOCK */}
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip.label}
            title={chip.title}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-3xs font-semibold uppercase tracking-wide text-dim"
          >
            {chip.label}
          </span>
        ))}
      </div>
      <p className="mt-2 truncate text-3xs text-dim" title={MARKETING_LOCK.claimOneLiner}>
        {claimLine}
      </p>

      {/* Score left, engine + UTM right; stacked below lg */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
        <div>
          <p className="text-3xs font-semibold uppercase tracking-wide text-dim">
            Activations · 7d
          </p>
          <p className="score-numeral mt-2 text-5xl text-light">
            {activationsLast7.toLocaleString()}
          </p>
          {sparkValues.length >= 2 && (
            <div className="mt-4" aria-hidden="true">
              <Sparkline
                id="activation-instrument"
                values={sparkValues}
                color={COLORS.emerald}
                width={220}
                height={48}
              />
            </div>
          )}
          <p className="mt-4 text-sm text-dim">
            {accountsLast7.toLocaleString()} accounts → {activationsLast7.toLocaleString()}{" "}
            activations
            {activationRate7d !== null ? ` · ${activationRate7d}% cohort` : ""}
          </p>
        </div>

        <div id="engine" className="scroll-mt-[calc(var(--nav-offset)+3.5rem)]">
          <div className="grid gap-3 sm:grid-cols-2">
            {GROWTH_ENGINES.map((engine) => (
              <a
                key={engine.key}
                href={engine.href}
                target="_blank"
                rel="noreferrer"
                className="glass-hover rounded-lg border border-white/10 px-4 py-3"
              >
                <p className="text-3xs font-semibold uppercase tracking-wide text-cyan">
                  {engine.label}
                </p>
                <p className="mt-1 font-display text-lg font-medium text-light">{engine.handle}</p>
                <p className="mt-1 text-3xs text-dim">
                  {engine.key === "tiktok"
                    ? "Public avatar still HOLD — do not invent a new asset."
                    : "First-class compose target. Not caption-only."}
                </p>
              </a>
            ))}
          </div>
          <p className="mt-2 text-3xs text-dim">
            LinkedIn is a third surface, not this week’s engine. Instagram and Threads are not
            peers.
          </p>

          <p className="mt-5 text-3xs font-semibold uppercase tracking-wide text-dim">
            This-week slate · X and TikTok
          </p>
          <ul className="mt-3 space-y-2">
            {ENGINE_WEEK_POSTS.map((p) => (
              <li
                key={p.campaign}
                className="glass flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-light">
                    <span className="text-cyan">{p.day}</span> ·{" "}
                    {p.platform === "x" ? "X" : "TikTok"} · {p.title}
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
                      source: p.platform,
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
          <p className="mt-2 text-3xs text-dim">
            Placeholders only. Queue / Approve is the ship path — do not auto-publish.
          </p>

          <div
            id="utm-builder"
            className="glass mt-5 scroll-mt-[calc(var(--nav-offset)+3.5rem)] p-3 sm:p-4"
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
