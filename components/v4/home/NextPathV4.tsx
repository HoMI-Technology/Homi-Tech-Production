import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";
import { HomeSectionV4 } from "@/components/v4/home/HomeSectionV4";
import type { HomeV4View } from "@/lib/v4/home-state";
import { V4_SHELL_PATH_HREF } from "@/lib/layout/v4-shell";
import { PATH_V4_EMPTY_TITLE, PATH_V4_HOLD_FOLLOW, PATH_V4_NEXT_FOLLOW } from "@/lib/v4/path-workspace";

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
          <p className="v4-support-follow">
            {view.hardStopActive ? PATH_V4_HOLD_FOLLOW : PATH_V4_NEXT_FOLLOW}
          </p>
          <Link href={V4_SHELL_PATH_HREF} className="v4-support-cta" data-home-v4-path-cta="">
            Open Path
            <ArrowRight aria-hidden className="size-3.5" strokeWidth={1.75} />
          </Link>
        </>
      ) : (
        <p className="v4-support-line text-dim">{PATH_V4_EMPTY_TITLE}</p>
      )}
    </HomeSectionV4>
  );
}
