import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";
import { HomeSectionV4 } from "@/components/v4/home/HomeSectionV4";
import type { HomeV4View } from "@/lib/v4/home-state";

export function NextPathV4({ view }: { view: HomeV4View }) {
  return (
    <HomeSectionV4
      kicker="Next on Path"
      data-home-v4-path-step=""
      aria-label="Current Path step"
      className="v4-support-card"
    >
      <span className="v4-support-icon" aria-hidden>
        <Route className="size-4" strokeWidth={1.75} />
      </span>
      {view.pathPrimary ? (
        <>
          <p className="v4-support-line">{view.pathPrimary.title}</p>
          <p className="v4-support-follow">The next move from this read. Not a second score.</p>
          <Link href={view.pathPrimary.href} className="v4-support-cta">
            Open Path
            <ArrowRight aria-hidden className="size-3.5" strokeWidth={1.75} />
          </Link>
        </>
      ) : (
        <p className="v4-support-line text-dim">Path appears after a read.</p>
      )}
    </HomeSectionV4>
  );
}
