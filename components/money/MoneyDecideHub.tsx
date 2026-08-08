import Link from "next/link";
import { COLORS, withAlpha } from "@/lib/brand";
import { LENSES, type LensDefinition, type LensRing } from "@/lib/tools/registry";

/**
 * Decide hub — decision jobs, not a calculator mall.
 * Lenses still live at /tools/* (public funnel + SEO); this is the Money home for them.
 */

type JobId = "housing" | "stability" | "horizon" | "readiness";

const JOBS: {
  id: JobId;
  title: string;
  subtitle: string;
  accent: string;
  rings?: LensRing[];
  ids?: string[];
}[] = [
  {
    id: "housing",
    title: "Housing decision",
    subtitle: "What you can carry — not just what a lender will approve.",
    accent: COLORS.cyan,
    ids: [
      "affordability",
      "mortgage",
      "rent-vs-buy",
      "down-payment",
      "heloc",
      "refinance",
      "loan-programs",
      "apr-compare",
    ],
  },
  {
    id: "stability",
    title: "Stability",
    subtitle: "Shock absorption before the leap.",
    accent: COLORS.emerald,
    ids: ["runway", "debt-payoff", "blind-budget"],
  },
  {
    id: "horizon",
    title: "Horizon",
    subtitle: "Independence and path risk — educational, not advice.",
    accent: COLORS.yellow,
    ids: ["fire", "monte-carlo", "roth-conversion"],
  },
  {
    id: "readiness",
    title: "Readiness probes",
    subtitle: "Same engine as the assessment — explore levers without a full retest.",
    accent: COLORS.cyan,
    rings: ["readiness"],
  },
];

function lensesForJob(job: (typeof JOBS)[number]): LensDefinition[] {
  if (job.ids) {
    const byId = new Map(LENSES.map((l) => [l.id, l]));
    return job.ids.map((id) => byId.get(id)).filter((l): l is LensDefinition => Boolean(l));
  }
  if (job.rings) {
    return LENSES.filter((l) => job.rings!.includes(l.ring));
  }
  return [];
}

export function MoneyDecideHub() {
  return (
    <div className="space-y-12">
      <div className="glass relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full opacity-40"
          style={{
            background: `radial-gradient(circle, ${withAlpha(COLORS.cyan, 0.2)}, transparent 70%)`,
          }}
        />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan">
            One picture · many lenses
          </p>
          <h2 className="mt-2 font-display text-2xl text-light sm:text-3xl">
            Stress the decision against your real numbers
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-dim sm:text-base">
            Every calculator seeds from your Money picture when you have one. Missing data
            stays missing — never invented. AI explains; the math is deterministic.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/money/budget" className="btn btn-ghost btn-sm">
              Fix picture
            </Link>
            <Link href="/scenarios" className="btn btn-ghost btn-sm">
              Scenario studio
            </Link>
            <Link href="/path" className="btn btn-ghost btn-sm">
              Path to Ready
            </Link>
          </div>
        </div>
      </div>

      {JOBS.map((job) => {
        const lenses = lensesForJob(job);
        if (lenses.length === 0) return null;
        return (
          <section key={job.id} aria-labelledby={`job-${job.id}`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id={`job-${job.id}`} className="font-display text-xl text-light">
                  <span
                    aria-hidden
                    className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                    style={{ background: job.accent }}
                  />
                  {job.title}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-dim">{job.subtitle}</p>
              </div>
              <span className="score-numeral text-xs text-dim/70">
                {lenses.length} lens{lenses.length === 1 ? "" : "es"}
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
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-light group-hover:text-cyan">{lens.name}</h3>
                    {lens.gate === "plus" && (
                      <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-dim">
                        Plus+
                      </span>
                    )}
                  </div>
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
  );
}
