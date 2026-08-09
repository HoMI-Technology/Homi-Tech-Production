"use client";

import Link from "next/link";
import { Fragment } from "react";

/**
 * Tool hand-offs made clickable: renders Companion message text with known
 * internal paths (/tools/*, /finance, /credit, /assessment, …) as links.
 * Deliberately conservative — only an allowlisted set of product routes ever
 * becomes a link, so model output can't fabricate navigation to arbitrary
 * or external destinations.
 */
const INTERNAL_PATH =
  /(\/(?:tools\/[a-z-]+|assessment|shadow-score|finance|credit|results|plan|simulator|advisor|connections|dashboard))(?=[\s.,;:!?)]|$)/g;

export function MessageContent({ text }: { text: string }) {
  const segments = text.split(INTERNAL_PATH);
  return (
    <>
      {segments.map((segment, i) =>
        i % 2 === 1 ? (
          <Link
            key={i}
            href={segment}
            className="text-cyan underline underline-offset-2 hover:opacity-80"
          >
            {segment}
          </Link>
        ) : (
          <Fragment key={i}>{segment}</Fragment>
        ),
      )}
    </>
  );
}
