"use client";

import { useEffect, useState } from "react";
import { sliderFillPercent } from "@/lib/assessment/format";
import {
  loadCreditState,
  saveCreditState,
  hasSavedCreditState,
  creditDisplay,
  DEFAULT_CREDIT_STATE,
  CREDIT_HARD_STOP,
  type CreditState,
} from "@/lib/credit/store";
import { loadRemoteCredit, saveRemoteCredit } from "@/lib/credit/persist";
import { createClient } from "@/lib/supabase/client";
import { COLORS } from "@/lib/brand";
import { ToolShell, ToolResultHero } from "@/components/tools/ToolShell";

const HARD_STOP = CREDIT_HARD_STOP;
const BANDS = [
  { min: 620, label: "660", value: 660 },
  { min: 660, label: "700", value: 700 },
  { min: 700, label: "740", value: 740 },
];

type Band = "below" | "fair" | "good" | "verygood" | "excellent";

function bandFor(score: number): Band {
  if (score < 620) return "below";
  if (score < 660) return "fair";
  if (score < 700) return "good";
  if (score < 740) return "verygood";
  return "excellent";
}

const BAND_META: Record<Band, { label: string; color: string; explanation: string }> = {
  below: {
    label: "Below 620 — protection zone",
    color: COLORS.crimson,
    explanation:
      "Below 620, HōMI will tell you NOT YET. That's not a punishment — it's the line where waiting protects you. Lenders at this range typically charge the highest rates or decline outright, and a rejected application can cost you more points than the wait would. Building above 620 first changes the entire deal you'll be offered.",
  },
  fair: {
    label: "620–659 — fair, but costly",
    color: COLORS.amber,
    explanation:
      "You clear the hard stop, but you're still in a range where lenders charge a premium for risk. Approvals are possible here, but the rate difference between this band and the next one up can be worth tens of thousands of dollars over a loan's life. A few more months of on-time payments and lower utilization can move you meaningfully.",
  },
  good: {
    label: "660–699 — good",
    color: COLORS.yellow,
    explanation:
      "This is a genuinely workable range. Most mainstream lenders will approve you here, though the best rates usually start a tier higher. If you're not in a rush, closing the gap to 700 is worth the wait.",
  },
  verygood: {
    label: "700–739 — very good",
    color: COLORS.emerald,
    explanation:
      "You're in the range where lenders compete for your business. Rate offers get noticeably better here, and most conventional loan programs treat you as low-risk.",
  },
  excellent: {
    label: "740 and above — excellent",
    color: COLORS.cyan,
    explanation:
      "You qualify for the best rates most lenders offer. There's little practical benefit to waiting for a higher score before a major financial decision — your credit is not the constraint anymore.",
  },
};

export default function CreditPage() {
  const [state, setState] = useState<CreditState>(DEFAULT_CREDIT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [ownNumbers, setOwnNumbers] = useState(false);
  const [remoteId, setRemoteId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function hydrate(): Promise<void> {
      const saved = hasSavedCreditState();
      const local = loadCreditState();
      if (active && saved) {
        setState(local);
        setOwnNumbers(true);
      }
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          const remote = await loadRemoteCredit(supabase, data.user.id);
          if (!active) return;
          setRemoteId(remote.row?.id ?? null);
          if (remote.state) {
            setState(remote.state);
            saveCreditState(remote.state);
            setOwnNumbers(true);
          } else if (hasSavedCreditState()) {
            const id = await saveRemoteCredit(supabase, data.user.id, local, null);
            if (active) setRemoteId(id);
            setOwnNumbers(true);
          }
        }
      } catch {
        // Local copy remains.
      }
      if (active) setHydrated(true);
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !ownNumbers) return;
    saveCreditState(state);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const supabase = createClient();
          const { data } = await supabase.auth.getUser();
          if (!data.user) return;
          const id = await saveRemoteCredit(supabase, data.user.id, state, remoteId);
          if (id) setRemoteId(id);
        } catch {
          // Best-effort production write.
        }
      })();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [state, hydrated, remoteId, ownNumbers]);

  const display = creditDisplay(ownNumbers, hydrated, state);
  const band = bandFor(state.score);
  const meta = BAND_META[band];
  const isHardStop = state.score < HARD_STOP;

  function claimNumbers(patch: Partial<CreditState>) {
    setOwnNumbers(true);
    setState((s) => ({ ...s, ...patch }));
  }

  return (
    <ToolShell
      eyebrow="Operate · credit"
      title="Credit health"
      description="A calm, honest read on where your credit stands — and what it means for what you can do next."
      backHref="/dashboard"
      backLabel="Dashboard"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass h-fit space-y-6 p-6">
          <SliderField
            label="Credit score"
            value={state.score}
            min={300}
            max={850}
            step={1}
            onChange={(v) => claimNumbers({ score: v })}
            suffix=""
          />
          <SliderField
            label="Credit utilization"
            value={state.utilization}
            min={0}
            max={100}
            step={1}
            onChange={(v) => claimNumbers({ utilization: v })}
            suffix="%"
          />
          <SliderField
            label="On-time payment streak"
            value={state.onTimeStreakMonths}
            min={0}
            max={60}
            step={1}
            onChange={(v) => claimNumbers({ onTimeStreakMonths: v })}
            suffix=" mo"
          />
        </div>

        <div className="space-y-6">
          <ToolResultHero
            label={display.label}
            value={display.value}
            color={display.showInterpretation ? meta.color : COLORS.cyan}
            badge={
              display.showInterpretation ? (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    isHardStop
                      ? "border-crimson/40 bg-verdict-notyet text-crimson"
                      : "border-slate-surface/60 text-light"
                  }`}
                  style={{ color: meta.color, borderColor: `${meta.color}55` }}
                >
                  {isHardStop
                    ? "DO NOT PROCEED zone"
                    : (meta.label.split("—")[0]?.trim() ?? meta.label)}
                </span>
              ) : (
                <span className="rounded-full border border-slate-surface/60 px-3 py-1 text-xs font-semibold text-dim">
                  Defaults are not a FICO file
                </span>
              )
            }
            footer={
              display.showInterpretation
                ? meta.explanation
                : "Move a slider when you have a real reading. HōMI will not treat 680 / 35% / 12 months as yours."
            }
          >
            {display.showInterpretation ? <ScoreDial score={state.score} /> : null}
          </ToolResultHero>
        </div>
      </div>

      <div className="mt-8 glass p-6">
        <h2 className="font-semibold text-light">Utilization</h2>
        <UtilizationGauge utilization={state.utilization} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BAND_META_ORDER.map((b) => (
          <BandCard key={b} bandKey={b} active={b === band} />
        ))}
      </div>

      <div className="mt-8 glass p-6">
        <h2 className="font-semibold text-light">Your action list</h2>
        <ActionList state={state} />
      </div>
    </ToolShell>
  );
}

const BAND_META_ORDER: Band[] = ["below", "fair", "good", "verygood"];

function BandCard({ bandKey, active }: { bandKey: Band; active: boolean }) {
  const meta = BAND_META[bandKey];
  return (
    <div className={`glass border p-5 ${active ? "border-cyan/50" : "border-slate-surface/60"}`}>
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: meta.color }} />
      <h3 className="mt-2 text-sm font-semibold text-light">{meta.label}</h3>
      <p className="mt-2 text-xs leading-relaxed text-dim">{meta.explanation}</p>
    </div>
  );
}

function ScoreDial({ score }: { score: number }) {
  const width = 360;
  const height = 220;
  const cx = width / 2;
  const cy = height - 20;
  const r = 140;
  const min = 300;
  const max = 850;

  const angleFor = (value: number) => Math.PI * (1 - (value - min) / (max - min));

  const arcPath = (fromValue: number, toValue: number) => {
    const a0 = angleFor(fromValue);
    const a1 = angleFor(toValue);
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };

  const clamped = Math.max(min, Math.min(max, score));
  const needleAngle = angleFor(clamped);
  const needleX = cx + (r - 10) * Math.cos(needleAngle);
  const needleY = cy - (r - 10) * Math.sin(needleAngle);
  const color = BAND_META[bandFor(score)].color;

  const markers = [HARD_STOP, ...BANDS.map((b) => b.value)];

  return (
    <div className="mt-2 flex flex-col items-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`Credit score ${score}`}
      >
        <path
          d={arcPath(min, HARD_STOP)}
          stroke={COLORS.crimson}
          strokeWidth="16"
          fill="none"
          opacity="0.6"
          strokeLinecap="round"
        />
        <path
          d={arcPath(HARD_STOP, 660)}
          stroke={COLORS.amber}
          strokeWidth="16"
          fill="none"
          opacity="0.6"
        />
        <path
          d={arcPath(660, 700)}
          stroke={COLORS.yellow}
          strokeWidth="16"
          fill="none"
          opacity="0.6"
        />
        <path
          d={arcPath(700, 740)}
          stroke={COLORS.emerald}
          strokeWidth="16"
          fill="none"
          opacity="0.6"
        />
        <path
          d={arcPath(740, max)}
          stroke={COLORS.cyan}
          strokeWidth="16"
          fill="none"
          opacity="0.6"
          strokeLinecap="round"
        />

        {markers.map((m) => {
          const a = angleFor(m);
          const x0 = cx + (r - 12) * Math.cos(a);
          const y0 = cy - (r - 12) * Math.sin(a);
          const x1 = cx + (r + 12) * Math.cos(a);
          const y1 = cy - (r + 12) * Math.sin(a);
          const lx = cx + (r + 26) * Math.cos(a);
          const ly = cy - (r + 26) * Math.sin(a);
          return (
            <g key={m}>
              <line
                x1={x0}
                y1={y0}
                x2={x1}
                y2={y1}
                stroke={m === HARD_STOP ? COLORS.crimson : COLORS.light}
                strokeWidth={m === HARD_STOP ? 3 : 2}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                fontSize="11"
                fill={m === HARD_STOP ? COLORS.crimson : COLORS.dim}
              >
                {m}
              </text>
            </g>
          );
        })}

        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={COLORS.light}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="7" fill={COLORS.light} />
      </svg>
      <p className="score-numeral -mt-4 text-4xl font-bold" style={{ color }}>
        {score}
      </p>
      <p className="mt-1 text-xs text-dim">FICO-style range, 300–850</p>
    </div>
  );
}

function UtilizationGauge({ utilization }: { utilization: number }) {
  const width = 400;
  const height = 60;
  const barWidth = width - 40;
  const pct = Math.max(0, Math.min(100, utilization));
  const color =
    pct <= 10
      ? COLORS.emerald
      : pct <= 30
        ? COLORS.yellow
        : pct <= 50
          ? COLORS.amber
          : COLORS.crimson;

  const markerX = (v: number) => 20 + (v / 100) * barWidth;

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`Credit utilization ${pct}%`}
      >
        <rect x="20" y="22" width={barWidth} height="14" rx="7" fill="rgba(51,65,85,0.6)" />
        <rect x="20" y="22" width={(pct / 100) * barWidth} height="14" rx="7" fill={color} />
        <line
          x1={markerX(10)}
          x2={markerX(10)}
          y1="14"
          y2="44"
          stroke={COLORS.emerald}
          strokeWidth="2"
        />
        <text x={markerX(10)} y="10" textAnchor="middle" fontSize="10" fill={COLORS.emerald}>
          10%
        </text>
        <line
          x1={markerX(30)}
          x2={markerX(30)}
          y1="14"
          y2="44"
          stroke={COLORS.yellow}
          strokeWidth="2"
        />
        <text x={markerX(30)} y="10" textAnchor="middle" fontSize="10" fill={COLORS.yellow}>
          30%
        </text>
      </svg>
      <p className="mt-2 text-xs leading-relaxed text-dim">
        {pct <= 10
          ? "Under 10% is the ideal range — this signals low reliance on credit and helps your score the most."
          : pct <= 30
            ? "Under 30% is generally considered safe, though getting below 10% helps further."
            : pct <= 50
              ? "Above 30% utilization typically starts to weigh on your score. Paying this down is one of the fastest levers you have."
              : "High utilization is one of the biggest drags on a credit score. Bringing this down is usually the single highest-leverage action available."}
      </p>
    </div>
  );
}

function ActionList({ state }: { state: CreditState }) {
  const items: string[] = [];

  if (state.score < HARD_STOP) {
    items.push(
      "Your score is below HōMI's 620 hard stop for major financial decisions. Focus on utilization and on-time payments before applying for new credit.",
    );
  }
  if (state.utilization > 30) {
    items.push(
      `Utilization is ${state.utilization}% — paying balances down toward 30% (and ideally 10%) is the fastest way to move your score.`,
    );
  }
  if (state.onTimeStreakMonths < 12) {
    items.push(
      "Payment history is the single largest factor in most scoring models. Keep every payment on time — automate it if that helps.",
    );
  } else {
    items.push(
      `You have a ${state.onTimeStreakMonths}-month on-time streak. Protect it — a single late payment can undo months of progress.`,
    );
  }
  if (state.score >= HARD_STOP && state.score < 700) {
    items.push(
      "You're clear of the hard stop but not yet in the range with the best rates. Closing the gap to 700 is worth the wait if your timeline allows it.",
    );
  }
  if (state.score >= 740) {
    items.push(
      "Your credit is in excellent shape. It is very unlikely to be the limiting factor in any near-term financial decision.",
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-dim">
          <svg
            className="mt-0.5 shrink-0 text-cyan"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  const fill = sliderFillPercent(value, min, max);
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm text-light">{label}</label>
        <span className="score-numeral text-sm text-cyan">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        className="homi-slider mt-2"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${fill}%` }}
      />
    </div>
  );
}
