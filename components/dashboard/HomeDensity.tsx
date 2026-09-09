import Link from "next/link";
import {
  FOLD_CONNECT_ACCOUNTS_LABEL,
  FOLD_CONNECTIONS_HREF,
  FOLD_FLAGS_NONE_INVENTED,
  FOLD_LIQUID_CONNECTED_LABEL,
  FOLD_MONEY_CONNECTED_HEADING,
  FOLD_MONEY_DEPTH_LABEL,
  FOLD_MONEY_EMPTY_HEADING,
  FOLD_MONEY_HREF,
  HOME_DENSITY_LENSES,
  HOME_DENSITY_OPEN_PATH_HREF,
  HOME_DENSITY_OPEN_PATH_LABEL,
  HOME_DENSITY_TOOLS_HEADING,
  HOME_DENSITY_VIEW_ALL_TOOLS_HREF,
  HOME_DENSITY_VIEW_ALL_TOOLS_LABEL,
  HOME_DENSITY_WHATS_NEXT_HEADING,
  MONEY_WAIT_LINE,
  foldRunwayLabel,
} from "@/lib/dashboard/fold-truth";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";

const DENSITY_EYEBROW =
  "text-2xs font-semibold uppercase tracking-[0.06em] text-dim";
/** Brand C1 — demoted footer links, not cyan peer weight. */
const DENSITY_FOOTER_LINK =
  "text-sm text-dim underline underline-offset-2 hover:text-cyan";

/**
 * HOME_SCRAPE_CRAFT — What's next + Money side by side, then ≤6 hub tools.
 * Path primary stays on the hero. No invented $.
 */
export function HomeDensity({
  lastMoney,
  pathTitles,
}: {
  lastMoney?: LastReadMoneyInputs | null;
  pathTitles: readonly string[];
}) {
  const liquidDollars = lastMoney?.liquidDollars;
  const connectedCash = liquidDollars != null && Number.isFinite(liquidDollars);
  const runwayMonths = lastMoney?.emergencyFundMonths;
  const runwayLabel = foldRunwayLabel(runwayMonths);
  const runwayUnderOne =
    runwayMonths != null && Number.isFinite(runwayMonths) && runwayMonths < 1;

  return (
    <div className="mt-3 w-full" data-home-density="">
      <div className="home-next-money grid grid-cols-1 gap-4 md:grid-cols-2">
        <section data-home-density-next="" aria-label="What's next">
          <p className={DENSITY_EYEBROW}>{HOME_DENSITY_WHATS_NEXT_HEADING}</p>
          {pathTitles.length > 0 ? (
            <ol className="mt-3 space-y-2 text-sm text-light/85">
              {pathTitles.map((title, index) => (
                <li key={title} data-home-density-next-step="" className="flex gap-2">
                  <span className="text-dim tabular-nums">{index + 1}.</span>
                  <span>{title}</span>
                </li>
              ))}
            </ol>
          ) : null}
          <p className="mt-3">
            <Link
              href={HOME_DENSITY_OPEN_PATH_HREF}
              className="btn rounded-full border border-white/15 bg-transparent text-light"
              data-home-density-open-path=""
            >
              {HOME_DENSITY_OPEN_PATH_LABEL} →
            </Link>
          </p>
        </section>

        <section data-home-density-money="" aria-label="Money">
          <p className={DENSITY_EYEBROW}>
            {connectedCash ? FOLD_MONEY_CONNECTED_HEADING : FOLD_MONEY_EMPTY_HEADING}
          </p>
          {connectedCash ? (
            <>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4" data-home-fold-cash="">
                  <span className="text-light">Liquid cash</span>
                  <span className="text-dim">{FOLD_LIQUID_CONNECTED_LABEL}</span>
                </div>
                <div className="flex justify-between gap-4" data-home-fold-runway="">
                  <span className="text-light">Runway</span>
                  <span className={runwayUnderOne ? "text-amber" : "text-dim"}>
                    {runwayLabel}
                  </span>
                </div>
                <div className="flex justify-between gap-4" data-home-fold-flags="">
                  <span className="text-light">Flags</span>
                  <span className="text-dim">{FOLD_FLAGS_NONE_INVENTED}</span>
                </div>
              </div>
              <p className="mt-3">
                <Link
                  href={FOLD_MONEY_HREF}
                  className={DENSITY_FOOTER_LINK}
                  data-home-fold-money-depth=""
                >
                  {FOLD_MONEY_DEPTH_LABEL}
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-dim" data-home-fold-cash-empty="">
                {MONEY_WAIT_LINE}
              </p>
              <p className="mt-3">
                <Link
                  href={FOLD_CONNECTIONS_HREF}
                  className="btn rounded-full border border-cyan bg-transparent text-cyan"
                  data-home-fold-connect=""
                >
                  {FOLD_CONNECT_ACCOUNTS_LABEL}
                </Link>
              </p>
            </>
          )}
        </section>
      </div>

      <section className="mt-4" data-home-density-tools="" aria-label="Tools">
        <div className="flex items-baseline justify-between gap-3">
          <p className={DENSITY_EYEBROW}>{HOME_DENSITY_TOOLS_HEADING}</p>
          <Link
            href={HOME_DENSITY_VIEW_ALL_TOOLS_HREF}
            className={DENSITY_FOOTER_LINK}
            data-home-density-view-tools=""
          >
            {HOME_DENSITY_VIEW_ALL_TOOLS_LABEL} →
          </Link>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3" data-home-density-tools-grid="">
          {HOME_DENSITY_LENSES.map((lens) => (
            <li key={lens.id}>
              <Link
                href={lens.href}
                className="flex h-full items-center justify-between gap-3 rounded-xl border border-white/[0.03] bg-navy-light p-3 sm:p-4"
                data-home-density-tool={lens.id}
                data-home-density-tool-kind={lens.kind}
              >
                <span className="min-w-0">
                  <span className="block text-2xs font-semibold uppercase tracking-[0.08em] text-dim">
                    {lens.kind === "hub" ? "Hub" : "Shell"}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-light">{lens.title}</span>
                  <span className="mt-1 block text-xs font-normal text-dim" data-home-density-tool-line="">
                    {lens.line}
                  </span>
                </span>
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-dim"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
