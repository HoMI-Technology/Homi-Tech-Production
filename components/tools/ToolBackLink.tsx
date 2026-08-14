"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ToolBackLinkInner({
  backHref,
  backLabel,
}: {
  backHref?: string;
  backLabel?: string;
}) {
  const searchParams = useSearchParams();
  const fromMoney = searchParams.get("from") === "money";
  const href = backHref ?? (fromMoney ? "/money/decide" : "/tools");
  const label =
    backLabel ?? (fromMoney || href === "/money/decide" ? "Money · Decide" : "All tools");

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}

/** Public-safe back link; Decide arrivals use ?from=money. */
export function ToolBackLink(props: { backHref?: string; backLabel?: string }) {
  return (
    <Suspense
      fallback={
        <Link
          href={props.backHref ?? "/tools"}
          className="inline-flex items-center gap-1.5 text-sm text-dim"
        >
          {props.backLabel ?? "All tools"}
        </Link>
      }
    >
      <ToolBackLinkInner {...props} />
    </Suspense>
  );
}
