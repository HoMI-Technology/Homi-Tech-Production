"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ACCOUNT_THEN_ASSESSMENT_HREF,
  CONTINUE_ASSESSMENT_HREF,
  FIRST_MOMENT_BEATS,
} from "@/components/marketing/first-moment-copy";
import { COLORS, withAlpha } from "@/lib/brand";

/**
 * Signed-out First Moment — five locked beats, then account → 45-q.
 * Not a companion picker. Not Monte Carlo. Not Shadow Score.
 */
export function FirstMoment() {
  const [index, setIndex] = useState(0);
  const beat = FIRST_MOMENT_BEATS[index];
  const last = index === FIRST_MOMENT_BEATS.length - 1;

  return (
    <section className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col justify-center px-6 py-16">
      <p className="type-kicker text-cyan">HōMI</p>

      <ol
        className="mt-6 flex items-center gap-2"
        aria-label={`Beat ${index + 1} of ${FIRST_MOMENT_BEATS.length}`}
      >
        {FIRST_MOMENT_BEATS.map((item, i) => {
          const current = i === index;
          const done = i < index;
          return (
            <li key={item.id}>
              <span
                className="block h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: current ? "1.75rem" : "0.75rem",
                  background: current || done ? COLORS.cyan : withAlpha(COLORS.dim, 0.28),
                  opacity: current || done ? 1 : 0.7,
                }}
                aria-current={current ? "step" : undefined}
              />
            </li>
          );
        })}
      </ol>

      <h1 className="font-display mt-8 text-2xl font-semibold leading-snug text-light sm:text-3xl">
        {beat.line}
      </h1>

      <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="btn btn-ghost"
          >
            Back
          </button>
        )}

        {last ? (
          <>
            <Link href={ACCOUNT_THEN_ASSESSMENT_HREF} className="btn btn-primary">
              {beat.cta}
            </Link>
            <Link href={CONTINUE_ASSESSMENT_HREF} className="btn btn-ghost">
              {"continueCta" in beat ? beat.continueCta : "Continue"}
            </Link>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(FIRST_MOMENT_BEATS.length - 1, i + 1))}
            className="btn btn-primary"
          >
            {beat.cta}
          </button>
        )}
      </div>
    </section>
  );
}
