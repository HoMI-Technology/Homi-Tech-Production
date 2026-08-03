import Link from "next/link";

import { COLORS } from "@/lib/brand";

/**
 * Compact connect CTA for the Financial position section when no bank is
 * linked yet. Free tier sees the same card framed as a Plus feature — an
 * honest upsell, never an error. Server-safe.
 */
export function BankConnectCard({ plusRequired }: { plusRequired: boolean }) {
  return (
    <div className="glass sweep relative overflow-hidden p-6 md:col-span-2 lg:col-span-3">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${COLORS.cyan}88, transparent)` }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-light">See your real numbers here</h3>
        {plusRequired && (
          <span className="rounded-full border border-cyan/40 px-2.5 py-0.5 text-xs text-cyan">Plus feature</span>
        )}
      </div>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">
        {plusRequired
          ? "Bank sync keeps your net worth, cash flow, and savings rate current automatically. It's part of the HōMI Plus plan — until then, the Finance dashboard works fully with manual numbers."
          : "Connect a bank for read-only balance and transaction context — net worth, cash flow, and savings rate update automatically after every sync. Revocable at any time."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {plusRequired ? (
          <>
            <Link href="/pricing" className="btn btn-primary btn-sm">
              See plans
            </Link>
            <Link href="/finance" className="btn btn-ghost btn-sm">
              Enter numbers manually
            </Link>
          </>
        ) : (
          <>
            <Link href="/connections" className="btn btn-primary btn-sm">
              Connect your bank
            </Link>
            <Link href="/finance" className="btn btn-ghost btn-sm">
              Enter numbers manually
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
