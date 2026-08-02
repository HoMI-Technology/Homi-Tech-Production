/**
 * ChainLinks — typed next-lens hand-offs on a result panel.
 *
 * Decision chains turn isolated calculators into a path: every result
 * ends with the most relevant next lens, pitched in product voice.
 * Links come from the registry only — never fabricated by a model —
 * consistent with the Companion's route allowlist.
 */

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { getLens, type LensChain } from "@/lib/tools/registry";

export function ChainLinks({ chains }: { chains: LensChain[] }) {
  const pathname = usePathname();
  const resolved = chains
    .map((c) => ({ chain: c, lens: getLens(c.lensId) }))
    .filter((r): r is { chain: LensChain; lens: NonNullable<ReturnType<typeof getLens>> } =>
      Boolean(r.lens),
    );
  if (resolved.length === 0) return null;

  return (
    <div className="glass p-6">
      <h2 className="font-semibold text-light">Keep going</h2>
      <div className="mt-4 space-y-3">
        {resolved.map(({ chain, lens }) => (
          <Link
            key={chain.lensId}
            href={lens.path}
            onClick={() =>
              track("chain_followed", { from: pathname, to: lens.path })
            }
            className="group flex items-center justify-between gap-3 rounded-lg border border-white/5 p-3 transition-colors hover:border-cyan/30"
          >
            <span>
              <span className="block text-sm font-medium text-light group-hover:text-cyan">
                {lens.name}
              </span>
              <span className="mt-0.5 block text-xs text-dim">{chain.pitch}</span>
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
              className="shrink-0 text-cyan transition-transform group-hover:translate-x-0.5"
            >
              <path d="M2 8h11m0 0L9 4m4 4l-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
