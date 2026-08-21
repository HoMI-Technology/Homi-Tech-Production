import Link from "next/link";
import type { Metadata } from "next";
import { RING_META, RING_ORDER, hubLensesByRing } from "@/lib/tools/registry";
import { getCachedUser } from "@/lib/supabase/server";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Tools",
  description:
    "Answer one math question at a time — honest educational lenses for housing, debt, and independence.",
  path: "/tools",
});

/**
 * Tools hub — ten public lenses from the registry (lib/tools/registry.ts).
 * Off-hub routes stay reachable as deep links; they are not peer cards.
 * Depth under Path — never remount as a Home fold grid.
 * See docs/TOOL_CONSOLIDATION.md and docs/MONEY-TOOLS-DEPTH.md.
 */
export default async function ToolsHubPage() {
  const user = await getCachedUser();
  const signedIn = !!user;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Decision math</p>
          <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">Tools</h1>
          <p className="mt-2 max-w-2xl text-dim">
            Lenses for the math. Not a catalog.{" "}
            {signedIn
              ? "Educational estimates only — pre-filled from your ledger."
              : "Educational estimates. Not a HōMI verdict."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {signedIn ? (
            <Link href="/money" className="text-sm font-medium text-cyan hover:underline">
              Open Money picture →
            </Link>
          ) : (
            <Link
              href={PRIMARY_CLOSE_HREF}
              className="text-sm font-medium text-cyan hover:underline"
            >
              {PRIMARY_CLOSE_LABEL}
            </Link>
          )}
        </div>
      </div>

      <div className="mt-10 space-y-14">
        {RING_ORDER.map((ring) => {
          const meta = RING_META[ring];
          const lenses = hubLensesByRing(ring);
          if (lenses.length === 0) return null;
          return (
            <section key={ring} aria-labelledby={`tools-${ring}`}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id={`tools-${ring}`} className="font-display text-xl text-light">
                    <span
                      aria-hidden
                      className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                      style={{ background: meta.accent }}
                    />
                    {meta.title}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-dim">{meta.subtitle}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lenses.map((lens) => (
                  <Link
                    key={lens.id}
                    href={lens.path}
                    className="glass glass-hover group relative flex flex-col overflow-hidden p-6 transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${lens.accent}88, transparent)`,
                      }}
                    />
                    <h3 className="font-semibold text-light group-hover:text-cyan">{lens.name}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-dim">{lens.desc}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan">
                      Open lens
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                        className="transition-transform group-hover:translate-x-0.5"
                      >
                        <path
                          d="M2 8h11m0 0L9 4m4 4l-4 4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-14 max-w-2xl text-xs leading-relaxed text-dim/70">
        HōMI tools are educational. They do not provide financial, tax, mortgage, or investment
        advice. Confirm critical numbers with qualified professionals before you act.
      </p>
    </div>
  );
}
