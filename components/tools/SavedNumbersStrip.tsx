/**
 * SavedNumbersStrip — the "your numbers" banner for lens pages.
 *
 * Two honest states, nothing in between:
 * - Saved finance data exists → name what's backing this page and how old
 *   it is, with an edit path back to the dashboard.
 * - Nothing saved → say plainly that the numbers are illustrative and
 *   offer the fix. Never implies the fallbacks are the user's.
 */

"use client";

import Link from "next/link";
import { useCfm } from "@/hooks/use-cfm";
import { formatCurrency } from "@/lib/tools/format";

function ageLabel(savedAt: string | null): string | null {
  if (!savedAt) return null;
  const days = Math.floor((Date.now() - new Date(savedAt).getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return null;
  if (days === 0) return "saved today";
  if (days === 1) return "saved yesterday";
  return `saved ${days} days ago`;
}

export function SavedNumbersStrip() {
  const { cfm, hydrated } = useCfm();

  // Render nothing until mounted — SSR and first paint must match.
  if (!hydrated) return null;

  if (!cfm) {
    return (
      <div className="glass mb-6 flex flex-wrap items-center justify-between gap-3 border-l-2 border-yellow/60 p-4">
        <p className="text-sm text-dim">
          These are illustrative numbers. Add yours and every calculator here starts from your
          reality instead.
        </p>
        <Link href="/money/budget" className="text-sm font-medium text-cyan hover:underline">
          Add my numbers →
        </Link>
      </div>
    );
  }

  const age = ageLabel(cfm.meta.savedAt);

  return (
    <div className="glass mb-6 flex flex-wrap items-center justify-between gap-3 border-l-2 border-cyan/60 p-4">
      <p className="text-sm text-dim">
        Built on your numbers —{" "}
        <span className="text-light">{formatCurrency(cfm.core.monthlyIncome.value)}/mo</span> income ·{" "}
        <span className="text-light">{formatCurrency(cfm.core.liquidSavings.value)}</span> savings ·{" "}
        <span className="text-light">{formatCurrency(cfm.core.monthlyDebtPayments.value)}/mo</span> debt
        {age ? <span className="text-dim/70"> · {age}</span> : null}
      </p>
      <Link href="/money/budget" className="text-sm font-medium text-cyan hover:underline">
        Edit in Money →
      </Link>
    </div>
  );
}
