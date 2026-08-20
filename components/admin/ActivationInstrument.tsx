import type { ReactNode } from "react";
import { OperateInstrument } from "@/components/operate/OperateInstrument";
import {
  ENGINE_WEEK_POSTS,
  GROWTH_ENGINES,
  MARKETING_LOCK,
  buildUtmUrl,
  truncateLabel,
} from "@/lib/admin/marketing-command";
import { COLORS } from "@/lib/brand";

export type ActivationInstrumentProps = {
  /** Compact UTM builder (client island) rendered under the engine rail. */
  utmSlot: ReactNode;
};

/**
 * This-week growth board for /admin/marketing.
 * Two engines only: X @Homi_Tech and TikTok @homi_technology.
 * Does not render Activated / Waitlist / Paid — those live on Overview and Waitlist.
 */
export function ActivationInstrument({ utmSlot }: ActivationInstrumentProps) {
  const claimLine = truncateLabel(MARKETING_LOCK.claimOneLiner, 80);

  return (
    <OperateInstrument tint={COLORS.cyan} className="mt-6">
      <p className="eyebrow">This week · two engines</p>
      <div className="dash-hero-meta" role="group" aria-label="This week engines">
        <p className="font-display text-xl font-medium leading-tight tracking-tight text-light">
          X + TikTok
        </p>
        <p>
          Compose, tag, queue, approve. Empty calendar is fine until a draft exists. Nothing
          auto-publishes.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

      <p className="mt-3 truncate text-3xs text-dim" title={MARKETING_LOCK.claimOneLiner}>
        {claimLine}
      </p>
      <p className="mt-1 text-3xs text-dim">
        LinkedIn is a third surface, not this week’s engine. Instagram and Threads are not peers.
      </p>

      <div id="engine" className="mt-6 scroll-mt-[calc(var(--nav-offset)+3.5rem)]">
        <p className="text-3xs font-semibold uppercase tracking-wide text-dim">
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
                  <span className="text-cyan">{p.day}</span> · {p.platform === "x" ? "X" : "TikTok"}{" "}
                  · {p.title}
                </p>
                <p className="mt-0.5 font-mono text-3xs text-dim">{p.campaign}</p>
              </div>
              <div className="flex gap-1.5">
                <a href={p.asset} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
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
          <p className="text-3xs font-semibold uppercase tracking-wide text-dim">UTM link builder</p>
          <div className="mt-3">{utmSlot}</div>
        </div>
      </div>
    </OperateInstrument>
  );
}
