"use client";

import { useState } from "react";
import { ClipboardCopy, Download, Printer } from "lucide-react";
import {
  downloadReceipt,
  issueReceipt,
  type LocalReceipt,
} from "@/lib/planner/receipts-local";
import { VERDICT_META } from "@/lib/brand";
import { usePlannerScore } from "@/components/planner/hooks";
import { PlanFooter, PlanSectionHeader, VerdictChip } from "./ui";

export default function PlanShare() {
  const plannerScore = usePlannerScore();
  const [receipt, setReceipt] = useState<LocalReceipt | null>(null);
  const [copied, setCopied] = useState<"summary" | "json" | null>(null);

  const copyText = async (text: string, kind: "summary" | "json") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  if (!plannerScore) {
    return (
      <section className="rounded-xl border border-line bg-slate-surface/20 p-5 sm:p-6">
        <PlanSectionHeader
          eyebrow="SHARE"
          title="Export pack"
          caption="Set your decision profile and load numbers so a band-only receipt can be issued."
        />
        <PlanFooter />
      </section>
    );
  }

  const meta = VERDICT_META[plannerScore.verdict];
  const summaryText = () => {
    return [
      `HōMI readiness — ${meta.label}`,
      `Verdict: ${meta.label} · score ${plannerScore.score} of 100`,
      `Pillars: Financial ${plannerScore.pillarPct.financial}% · Emotional ${plannerScore.pillarPct.emotional}% · Timing ${plannerScore.pillarPct.timing}%`,
      `Next steps:`,
      ...plannerScore.nextSteps.map((s, i) => `${i + 1}. ${s}`),
      "Educational guidance only — not financial, legal, tax, or investment advice.",
    ].join("\n");
  };

  return (
    <section className="rounded-xl border border-line bg-slate-surface/20 p-5 sm:p-6">
      <PlanSectionHeader
        eyebrow="SHARE"
        title="Export pack"
        caption="Score, pillars, next steps, and a band-only receipt — shareable artifact. Educational only."
        right={<VerdictChip verdict={plannerScore.verdict} />}
      />

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-light hover:bg-white/5"
          onClick={() => void copyText(summaryText(), "summary")}
        >
          <ClipboardCopy className="h-4 w-4" />
          {copied === "summary" ? "Copied" : "Copy summary"}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-cyan/20 px-3 py-2 text-sm text-cyan hover:bg-cyan/30"
          onClick={() => {
            const r = issueReceipt({
              score: plannerScore.score,
              verdict: plannerScore.verdict,
            });
            setReceipt(r);
            downloadReceipt(r);
          }}
        >
          <Download className="h-4 w-4" />
          Download receipt
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-dim hover:text-light"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-navy/40 p-4">
        <p className="text-3xs uppercase tracking-wider text-dim">
          HōMI readiness
        </p>
        <p className="mt-1 font-score text-4xl text-light">
          {plannerScore.score.toFixed(0)}
        </p>
        <p className="text-sm text-cyan">{meta.label}</p>
        {receipt && (
          <p className="mt-3 font-score text-xs text-dim">{receipt.token}</p>
        )}
        <p className="mt-3 text-2xs text-dim">
          Educational only — not credit, lending, legal, tax, or investment
          advice. Band-only receipt · no underlying financials.
        </p>
      </div>

      <PlanFooter />
    </section>
  );
}
