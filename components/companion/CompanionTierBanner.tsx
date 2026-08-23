"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getEntitlements } from "@/lib/entitlements";
import { companionTierCopy, type CompanionTierCopy } from "@/lib/advisor/companion-tier-copy";

type LoadState = { status: "loading" } | { status: "ready"; copy: CompanionTierCopy };

/**
 * Honest free vs paid Companion label. Reads `/api/account/entitlements`
 * (server-authoritative display only — never weakens server gates). On
 * 401/error, fails closed to free-tier copy so we never over-promise AI.
 */
export function CompanionTierBanner({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    async function load() {
      const freeDefaults = getEntitlements("free");
      try {
        const res = await fetch("/api/account/entitlements?usage=1", { cache: "no-store" });
        if (!res.ok) {
          if (active) {
            setState({
              status: "ready",
              copy: companionTierCopy({
                advisorRealModel: freeDefaults.advisorRealModel,
                advisorMessagesPerDay: freeDefaults.advisorMessagesPerDay,
              }),
            });
          }
          return;
        }
        const json = (await res.json()) as {
          entitlements?: {
            advisorRealModel?: boolean;
            advisorMessagesPerDay?: number;
          };
          usage?: { remainingToday?: number; remainingThisMonth?: number } | null;
        };
        const ent = json.entitlements;
        const usage = json.usage ?? null;
        if (active) {
          setState({
            status: "ready",
            copy: companionTierCopy({
              advisorRealModel: Boolean(ent?.advisorRealModel),
              advisorMessagesPerDay:
                typeof ent?.advisorMessagesPerDay === "number"
                  ? ent.advisorMessagesPerDay
                  : freeDefaults.advisorMessagesPerDay,
              remainingToday:
                typeof usage?.remainingToday === "number" ? usage.remainingToday : null,
              remainingThisMonth:
                typeof usage?.remainingThisMonth === "number" ? usage.remainingThisMonth : null,
            }),
          });
        }
      } catch {
        if (active) {
          setState({
            status: "ready",
            copy: companionTierCopy({
              advisorRealModel: freeDefaults.advisorRealModel,
              advisorMessagesPerDay: freeDefaults.advisorMessagesPerDay,
            }),
          });
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") return null;

  const { copy } = state;
  const isFree = copy.kind === "free";

  return (
    <div
      role="status"
      data-companion-tier={copy.kind}
      className={
        compact
          ? "flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-surface/60 px-3 py-1.5 text-2xs leading-snug"
          : "flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-surface/60 px-4 py-2 text-xs leading-snug sm:px-5"
      }
    >
      <span
        className={
          isFree
            ? "rounded-full border border-yellow/30 bg-yellow/10 px-2 py-0.5 font-medium text-yellow"
            : "rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5 font-medium text-cyan"
        }
      >
        {copy.summary}
      </span>
      {copy.detail && <span className="text-dim">{copy.detail}</span>}
      {copy.upgradeHref && copy.upgradeLabel && (
        <Link
          href={copy.upgradeHref}
          className="font-medium text-cyan underline-offset-2 hover:underline"
        >
          {copy.upgradeLabel}
        </Link>
      )}
    </div>
  );
}
