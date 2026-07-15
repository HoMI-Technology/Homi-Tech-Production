import Link from "next/link";
import { anyNeedsAttention, syncedAgo, type ItemReading } from "@/lib/dashboard/financial-position";

/**
 * Connected-accounts tile — StatTile visual language plus per-item freshness
 * and an attention chip when any connection needs the user. Server-safe.
 */
export function ConnectionsTile({ items, accountCount }: { items: ItemReading[]; accountCount: number }) {
  const attention = anyNeedsAttention(items);
  return (
    <div className="glass glass-hover sweep relative overflow-hidden p-5">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #34d39988, transparent)" }}
      />
      <p className="eyebrow">Connected accounts</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="score-numeral text-3xl font-bold leading-none text-light" style={{ textShadow: "0 0 28px #34d39944" }}>
          {accountCount}
          <span className="ml-1 text-sm font-medium text-dim">
            {items.length === 1 ? "· 1 bank" : `· ${items.length} banks`}
          </span>
        </p>
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => {
          const healthy = item.status === "healthy";
          return (
            <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-dim">{item.institution_name ?? "Connected bank"}</span>
              {healthy ? (
                <span className="shrink-0 text-dim">{syncedAgo(item.last_successful_sync)}</span>
              ) : (
                <Link
                  href="/connections"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-yellow/40 px-2 py-0.5 text-yellow"
                >
                  <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                  Needs attention
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 text-xs">
        <Link
          href="/connections"
          className={`${attention ? "text-yellow" : "text-cyan"} underline-offset-2 hover:underline`}
        >
          {attention ? "Fix connections →" : "Manage connections →"}
        </Link>
      </div>
    </div>
  );
}
