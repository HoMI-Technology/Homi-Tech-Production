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

/**
 * HOME_DENSITY_CRAFT — Money → What's next → Tools below the quiet PR7 fold.
 * Inter only. Path primary stays on the fold. No companion, no invented $.
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
    <div
      className="mt-12 w-full max-w-[720px] border-t border-white/[0.03] pt-8"
      data-home-density=""
    >
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
                className="text-sm text-dim underline underline-offset-2 hover:text-cyan"
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

      <section className="mt-8" data-home-density-next="" aria-label="What's next">
        <p className={DENSITY_EYEBROW}>{HOME_DENSITY_WHATS_NEXT_HEADING}</p>
        {pathTitles.length > 0 ? (
          <ol className="mt-3 space-y-2 text-sm text-light/85">
            {pathTitles.map((title) => (
              <li key={title} data-home-density-next-step="">
                {title}
              </li>
            ))}
          </ol>
        ) : null}
        <p className="mt-3">
          <Link
            href={HOME_DENSITY_OPEN_PATH_HREF}
            className="text-sm text-cyan underline-offset-2 hover:underline"
            data-home-density-open-path=""
          >
            {HOME_DENSITY_OPEN_PATH_LABEL}
          </Link>
        </p>
      </section>

      <section className="mt-8" data-home-density-tools="" aria-label="Tools">
        <p className={DENSITY_EYEBROW}>{HOME_DENSITY_TOOLS_HEADING}</p>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HOME_DENSITY_LENSES.map((lens) => (
            <li key={lens.id}>
              <Link
                href={lens.href}
                className="flex h-full items-center justify-between gap-3 rounded-xl border border-white/[0.03] bg-navy-light p-4"
                data-home-density-tool={lens.id}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-light">{lens.title}</span>
                  <span className="mt-1 block text-sm text-dim">{lens.line}</span>
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
        <p className="mt-3">
          <Link
            href={HOME_DENSITY_VIEW_ALL_TOOLS_HREF}
            className="text-sm text-cyan underline-offset-2 hover:underline"
            data-home-density-view-tools=""
          >
            {HOME_DENSITY_VIEW_ALL_TOOLS_LABEL}
          </Link>
        </p>
      </section>
    </div>
  );
}
