import Link from "next/link";
import type { Metadata } from "next";
import { LENSES, RING_META, RING_ORDER, lensesByRing } from "@/lib/tools/registry";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Honest calculators for the math behind your biggest decisions — housing, runway, debt, and independence.",
  alternates: { canonical: "/tools" },
};

/**
 * Tools hub — rendered entirely from the lens registry (lib/tools/registry.ts).
 * Tool metadata lives in exactly one place; adding a lens to the registry
 * adds it here, to the Companion's tool directory, and to the prefill
 * contract in one edit.
 */
export default function ToolsHubPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Decision math · public</p>
          <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">Tools</h1>
          <p className="mt-2 max-w-2xl text-dim">
            No hype, no black boxes — the math behind decisions that matter, laid out plainly.
            {` ${LENSES.length} calculators.`} Sign in to seed them from your Money picture.
            Educational guidance only.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link href="/money" className="text-sm font-medium text-cyan hover:underline">
            Open Money picture →
          </Link>
          <Link
            href="/scenarios"
            className="text-sm font-medium text-dim hover:text-cyan hover:underline"
          >
            Scenario studio →
          </Link>
        </div>
      </div>

      <div className="mt-10 space-y-14">
        {RING_ORDER.map((ring) => {
          const meta = RING_META[ring];
          const lenses = lensesByRing(ring);
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
                <span className="score-numeral text-xs text-dim/70">
                  {lenses.length} tool{lenses.length === 1 ? "" : "s"}
                </span>
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
                      Open calculator
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
