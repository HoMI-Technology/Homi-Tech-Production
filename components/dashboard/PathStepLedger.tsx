"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadReadinessPath, pullReadinessPath, type ReadinessPath } from "@/lib/readiness";

/**
 * Neutral ledger of completed Path steps on Home.
 * No streaks, no "days behind," no percent — just what moved, in order.
 * Hidden while a hard stop is active (R2) or when nothing is done yet.
 */
export function PathStepLedger({ suppress }: { suppress: boolean }) {
  const [path, setPath] = useState<ReadinessPath | null>(null);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      let current = loadReadinessPath();
      if (active) setPath(current);
      try {
        const remote = await pullReadinessPath();
        if (active && remote) setPath(remote);
      } catch {
        // anonymous / offline — local only
      }
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  if (suppress || !path) return null;

  const doneSteps = path.steps.filter((s) => (s.status ?? "pending") === "done");
  if (doneSteps.length === 0) return null;

  return (
    <div className="mt-5" data-path-step-ledger="">
      <p className="text-3xs font-bold uppercase tracking-[0.14em] text-dim">
        Steps completed
      </p>
      <ul className="mt-2 space-y-1.5">
        {doneSteps.map((step) => (
          <li
            key={step.id}
            className="flex items-start gap-2 text-sm text-light/85"
            data-path-ledger-step={step.id}
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald" aria-hidden />
            <span className="min-w-0">
              <span className="text-light">{step.title}</span>
              {step.href ? (
                <Link
                  href={step.href}
                  className="ml-2 text-xs text-cyan/80 underline-offset-2 hover:underline"
                >
                  Open
                </Link>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
