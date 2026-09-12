"use client";

import { useRouter } from "next/navigation";
import { MetricRail } from "@/components/operate/MetricRail";
import { PageFrame } from "@/components/operate/PageFrame";
import {
  TEAM_V4_NO_INDIVIDUALS,
  teamV4MetricCells,
  type TeamV4View,
} from "@/lib/v4/team-workspace";

export function TeamWorkspaceV4({ view }: { view: TeamV4View }) {
  const router = useRouter();
  const cells = teamV4MetricCells(view);

  return (
    <PageFrame role="team" density="compact">
      <div data-team-v4="" data-team-v4-kind={view.kind} data-operate-role="team">
        {view.eyebrow ? (
          <p className="v4-system-age" data-team-v4-stale="">
            {view.eyebrow}
          </p>
        ) : null}

        <div className={view.eyebrow ? "mt-3" : "mt-1"}>
          <h1 className="v4-system-title">{view.title}</h1>
          {view.body ? <p className="v4-system-body mt-2">{view.body}</p> : null}
        </div>

        {view.cta ? (
          <div className="mt-6">
            <button
              type="button"
              className="btn btn-primary"
              data-team-v4-cta=""
              onClick={() => router.refresh()}
            >
              {view.cta.label}
            </button>
          </div>
        ) : null}

        {cells.length > 0 ? (
          <div className="mt-6" data-team-aggregates="">
            <MetricRail cells={cells} />
          </div>
        ) : (
          <div data-team-aggregates="" hidden />
        )}

        {view.honesty ? (
          <p className="mt-4 text-sm text-dim" data-team-v4-honesty="">
            {view.honesty}
          </p>
        ) : null}

        <p className="sr-only">{TEAM_V4_NO_INDIVIDUALS}</p>
      </div>
    </PageFrame>
  );
}
