"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/brand";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { Temperature } from "@/lib/finance/store";

export interface KpiMeter {
  /** 0..1 fill fraction */
  fraction: number;
  /** tick positions as 0..1 fractions */
  ticks?: number[];
}

const TEMP_COLOR: Record<Temperature, string> = {
  emerald: COLORS.emerald,
  yellow: COLORS.yellow,
  amber: COLORS.amber,
  crimson: COLORS.crimson,
};

const TEMP_TEXT: Record<Temperature, string> = {
  emerald: "text-emerald",
  yellow: "text-yellow",
  amber: "text-amber",
  crimson: "text-crimson",
};

/**
 * Shared KPI card — spring value, delta chip, temperature dot, meter or sparkline.
 * Glass surface with a subtle top hairline in the temperature color.
 */
export function KpiCard({
  label,
  value,
  format,
  delta,
  temperature,
  caption,
  meter,
  spark,
  onClick,
  index = 0,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  delta?: { text: string; positive: boolean };
  temperature?: Temperature;
  caption?: string;
  meter?: KpiMeter;
  spark?: number[];
  onClick?: () => void;
  index?: number;
}) {
  const tempColor = temperature ? TEMP_COLOR[temperature] : COLORS.cyan;
  const tempText = temperature ? TEMP_TEXT[temperature] : "text-light";

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="glass glass-hover relative flex h-full w-full flex-col overflow-hidden p-5 text-left"
    >
      {temperature && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${tempColor}88, transparent)` }}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-dim">{label}</span>
        {temperature && (
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ backgroundColor: tempColor, boxShadow: `0 0 6px ${tempColor}` }}
          />
        )}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <AnimatedNumber
          value={value}
          format={format}
          className={`score-numeral text-3xl font-bold tracking-tight ${tempText}`}
        />
      </div>
      {caption && <p className="mt-1 text-xs text-dim">{caption}</p>}
      {delta && (
        <span
          className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold ${
            delta.positive ? "bg-emerald/10 text-emerald" : "bg-crimson/10 text-crimson"
          }`}
        >
          {delta.positive ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M7 17L17 7" />
              <path d="M7 7h10v10" />
            </svg>
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M7 7l10 10" />
              <path d="M17 7v10H7" />
            </svg>
          )}
          {delta.text}
        </span>
      )}
      {meter && (
        <div className="relative mt-auto pt-4">
          <div className="relative h-[4px] overflow-visible rounded-full bg-slate-surface/60">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, meter.fraction * 100))}%` }}
              transition={{ duration: 0.7, delay: 0.15 + index * 0.06, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                backgroundColor: tempColor,
                boxShadow: `0 0 8px ${tempColor}88`,
              }}
            />
            {meter.ticks?.map((t, i) => (
              <span
                key={i}
                className="absolute top-[-3px] h-[10px] w-px bg-light/20"
                style={{ left: `${t * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}
      {spark && spark.length > 1 && (
        <div className="mt-auto pt-3">
          <Sparkline values={spark} color={tempColor} />
        </div>
      )}
    </motion.button>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100;
  const h = 26;
  const pts = values.map(
    (v, i) => `${(i / (values.length - 1)) * w},${h - 3 - ((v - min) / range) * (h - 6)}`,
  );
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-[26px] w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
