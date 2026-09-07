import Link from "next/link";
import type { Metadata } from "next";
import { hubLenses } from "@/lib/tools/registry";
import { getCachedUser } from "@/lib/supabase/server";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { pageMetadata } from "@/lib/seo/metadata";
import { JobDepthFrame } from "@/components/layout/JobDepthFrame";

export const metadata: Metadata = pageMetadata({
  title: "Tools",
  description:
    "Answer one math question at a time — honest educational lenses. Estimates never write your official score.",
  path: "/tools",
});

/**
 * Decide job primary surface — Brand craft catalog on live `/tools`.
 * Ten hub lenses, equal weight. Educational only — no score write.
 */
export default async function ToolsHubPage() {
  const user = await getCachedUser();
  const signedIn = !!user;
  const lenses = hubLenses();

  return (
    <JobDepthFrame job="tools" width="catalog">
      <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-dim">
        Tools · money · decide · live route depth
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-light">Decision lenses</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">
        Ten quiet lenses for a choice. Estimates only — never a verdict factory.
      </p>

      <div
        role="note"
        data-decide-honesty=""
        className="mt-6 rounded-xl border border-yellow/45 bg-yellow/[0.06] px-4 py-3"
      >
        <p className="text-sm leading-relaxed text-light">
          <span className="font-semibold text-yellow">Educational estimates</span>
          {" — "}
          pre-filled from ledger when present. They do not write your score or ledger.
        </p>
      </div>

      {signedIn ? (
        <p className="mt-4 text-sm text-dim">
          <Link href="/money" className="text-cyan underline-offset-2 hover:underline">
            Money picture
          </Link>
          {" · "}
          <Link href="/money/decide" className="text-cyan underline-offset-2 hover:underline">
            Supporting lenses
          </Link>
        </p>
      ) : (
        <p className="mt-4 text-sm">
          <Link href={PRIMARY_CLOSE_HREF} className="text-cyan underline-offset-2 hover:underline">
            {PRIMARY_CLOSE_LABEL}
          </Link>
        </p>
      )}

      <ul
        className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2"
        data-tools-hub=""
        data-decide-catalog=""
      >
        {lenses.map((lens) => (
          <li key={lens.id}>
            <Link
              href={lens.path}
              aria-label={`Open lens: ${lens.name}`}
              className="flex h-full flex-col rounded-xl border border-white/[0.08] bg-navy/40 px-4 py-4 transition-colors hover:border-white/[0.14]"
            >
              <p className="text-sm font-medium text-light">{lens.name}</p>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-dim">{lens.desc}</p>
              <span className="sr-only">Open lens</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 max-w-xl text-xs leading-relaxed text-dim/70">
        Supporting depth: Scenarios · close language stays law (changed / unchanged / hard stop still
        on). FI v2 & Monte Carlo quarantined.
      </p>
      <p className="mt-3 max-w-xl text-xs leading-relaxed text-dim/70">
        No Apply-to-my-score. No Packet 2. No guest HōMI verdict.
      </p>
      <p className="mt-3 max-w-xl text-xs leading-relaxed text-dim/70">
        HōMI tools are educational. They do not provide financial, tax, mortgage, or investment
        advice. Confirm critical numbers with qualified professionals before you act.
      </p>
    </JobDepthFrame>
  );
}
