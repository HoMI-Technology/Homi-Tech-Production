"use client";

import Link from "next/link";
import { AttentionStrip } from "@/components/operate/AttentionStrip";
import { MetricRail } from "@/components/operate/MetricRail";
import { PageFrame } from "@/components/operate/PageFrame";
import {
  ADMIN_V4_EMPTY_ATTENTION,
  adminV4MetricCells,
  type AdminV4View,
} from "@/lib/v4/admin-workspace";

export function AdminWorkspaceV4({ view }: { view: AdminV4View }) {
  const cells = adminV4MetricCells(view);

  return (
    <PageFrame role="admin" density="compact">
      <div data-admin-v4="" data-admin-v4-kind={view.kind} data-operate-role="admin">
        <div className="mt-1" data-admin-attention="">
          <AttentionStrip
            items={[...view.attention]}
            title="Attention"
            emptyCopy={view.attentionEmpty ?? ADMIN_V4_EMPTY_ATTENTION}
          />
        </div>

        {cells.length > 0 ? (
          <div className="mt-6">
            <MetricRail cells={cells} />
          </div>
        ) : null}

        <div className="mt-8">
          <h1 className="v4-system-title">{view.title}</h1>
          <p className="v4-system-meta mt-2">{view.body}</p>
        </div>

        {view.jobs.length > 0 ? (
          <ul className="v4-admin-jobs mt-6" aria-label="Ops jobs" data-admin-v4-jobs="">
            {view.jobs.map((job) => (
              <li key={job.id} className="v4-admin-job" data-admin-v4-job={job.id}>
                <span className="v4-admin-job-title">{job.title}</span>
                <Link href={job.href} className="v4-admin-job-cta">
                  {job.cta}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </PageFrame>
  );
}
