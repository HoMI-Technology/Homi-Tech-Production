"use client";

import { ApprovalQueue } from "@/components/admin/ApprovalQueue";
import { PageFrame } from "@/components/operate/PageFrame";
import { PageHeader } from "@/components/operate/PageHeader";
import type { MarketingAssetRow } from "@/lib/admin/agency-approvals";
import {
  ADMIN_V4_MARKETING_BODY,
  ADMIN_V4_MARKETING_TITLE,
  type AdminV4Draft,
} from "@/lib/v4/admin-workspace";

export function AdminMarketingV4({
  assets,
  drafts,
}: {
  assets: MarketingAssetRow[];
  drafts: readonly AdminV4Draft[];
}) {
  return (
    <PageFrame role="admin" density="compact">
      <div data-admin-v4-marketing="" data-operate-role="admin">
        <div className="v4-admin-stage" aria-label="Marketing stage">
          <span className="v4-admin-stage-pill is-on">Queue</span>
          <span className="v4-admin-stage-pill is-on">Approve</span>
          <span className="v4-admin-stage-pill is-off" aria-disabled="true">
            Publish
          </span>
        </div>

        <PageHeader eyebrow="Admin" title={ADMIN_V4_MARKETING_TITLE} description={ADMIN_V4_MARKETING_BODY} />

        {drafts.length > 0 ? (
          <ul className="v4-admin-jobs mt-6" aria-label="Draft queue" data-admin-v4-drafts="">
            {drafts.map((draft) => (
              <li key={draft.id} className="v4-admin-job" data-admin-v4-draft={draft.platform}>
                <span className="v4-admin-job-title">{draft.title}</span>
                <span className="v4-admin-job-cta">{draft.action === "approve" ? "Approve" : "Queue"}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8" data-admin-v4-queue="">
          <ApprovalQueue initialAssets={assets} />
        </div>
      </div>
    </PageFrame>
  );
}
