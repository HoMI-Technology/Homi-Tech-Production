import Link from "next/link";
import { OperateInstrument } from "@/components/operate/OperateInstrument";
import { COLORS } from "@/lib/brand";
import {
  evaluateFleet,
  fleetSummary,
  type FleetSignals,
} from "@/lib/admin/agency-fleet";

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald",
  needs_you: "bg-amber",
  blocked: "bg-crimson",
  idle: "bg-dim",
};

const STATUS_RING: Record<string, string> = {
  online: "border-emerald/30",
  needs_you: "border-amber/40",
  blocked: "border-crimson/40",
  idle: "border-white/10",
};

/**
 * Collapsed desk fleet — not the Activated / Waitlist / Paid hero.
 * Pure server component: status derived from live page signals.
 */
export function AgencyControlTower({
  signals,
  uniqueActivated7d,
  completions7d,
  cohortLine,
}: {
  signals: FleetSignals;
  uniqueActivated7d: number;
  completions7d: number;
  cohortLine: string;
}) {
  const fleet = evaluateFleet(signals);
  const summary = fleetSummary(fleet);
  const tint =
    summary.blocked > 0
      ? COLORS.crimson
      : summary.needsYou > 0
        ? COLORS.amber
        : COLORS.emerald;

  return (
    <OperateInstrument tint={tint} className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Fleet (collapsed)</p>
          <div className="dash-hero-meta" role="group" aria-label="Desk fleet">
            <p className="font-display text-2xl font-medium leading-tight tracking-tight text-light">
              X + TikTok first. Approve before ship.
            </p>
            <p>
              Desks stay behind this fold. Claim-law armed. Nothing public without approval.
              Activated / Waitlist / Paid live on Overview and Waitlist — not here.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusChip label="Online" value={summary.online} tone="emerald" />
          <StatusChip label="Needs you" value={summary.needsYou} tone="amber" />
          <StatusChip label="Blocked" value={summary.blocked} tone="crimson" />
          <StatusChip label="Idle" value={summary.idle} tone="dim" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="glass p-4">
          <p className="text-3xs font-semibold uppercase tracking-wide text-dim">
            Scoreboard lives elsewhere
          </p>
          <p className="mt-2 text-sm text-light">
            Activated / Waitlist / Paid are on{" "}
            <Link href="/admin" className="text-cyan hover:underline">
              Overview
            </Link>{" "}
            and{" "}
            <Link href="/admin/waitlist" className="text-cyan hover:underline">
              Waitlist
            </Link>
            .
          </p>
          <p className="mt-1 text-xs text-dim">
            Honest 7d: {uniqueActivated7d.toLocaleString()} unique ·{" "}
            {completions7d.toLocaleString()} completions — zeros stay zeros.
          </p>
        </div>
        <div className="glass p-4 sm:col-span-2">
          <p className="text-3xs font-semibold uppercase tracking-wide text-dim">Cohort</p>
          <p className="mt-2 text-sm leading-relaxed text-light">{cohortLine}</p>
          <p className="mt-2 text-xs text-dim">
            AI: {signals.aiEnabled ? "Anthropic configured" : "templates only"} · Resend:{" "}
            {signals.resendConfigured ? "ready" : "missing"}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-3xs font-semibold uppercase tracking-wide text-dim">Agent fleet</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {fleet.map((agent) => (
            <li key={agent.id}>
              <a
                href={`#${agent.deskId}`}
                className={`glass-hover flex h-full flex-col rounded-xl border p-3 transition-colors ${STATUS_RING[agent.status]}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[agent.status]}`}
                    aria-hidden
                  />
                  <span className="text-sm font-semibold text-light">{agent.name}</span>
                </div>
                <p className="mt-1 text-3xs uppercase tracking-wide text-dim">{agent.role}</p>
                <p className="mt-2 flex-1 text-xs leading-snug text-dim">{agent.mandate}</p>
                <p className="mt-2 text-3xs font-medium text-cyan">{agent.statusLabel}</p>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
        <Link href="#desk-content" className="btn btn-primary btn-sm">
          Open content desk
        </Link>
        <Link href="#desk-email" className="btn btn-ghost btn-sm">
          Email desk
        </Link>
        <Link href="#engine" className="btn btn-ghost btn-sm">
          This week engine
        </Link>
        <Link href="#proof" className="btn btn-ghost btn-sm">
          Proof
        </Link>
        <a
          href="/marketing/gtm/HOMI-SOLO-GTM-OS.md" // brand-ok: asset filename on disk, not user-visible brand text
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost btn-sm"
        >
          GTM OS
        </a>
      </div>
    </OperateInstrument>
  );
}

function StatusChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "crimson" | "dim";
}) {
  const color =
    tone === "emerald"
      ? COLORS.emerald
      : tone === "amber"
        ? COLORS.amber
        : tone === "crimson"
          ? COLORS.crimson
          : COLORS.dim;
  return (
    <div className="glass px-3 py-2 text-center">
      <p className="score-numeral text-lg" style={{ color }}>
        {value}
      </p>
      <p className="text-3xs uppercase tracking-wide text-dim">{label}</p>
    </div>
  );
}
