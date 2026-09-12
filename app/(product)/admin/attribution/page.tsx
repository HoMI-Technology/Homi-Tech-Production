import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminRoomEmptyV4 } from "@/components/v4/admin/AdminRoomEmptyV4";
import { PageHeader } from "@/components/operate/PageHeader";
import { PageFrame } from "@/components/operate/PageFrame";
import { MetricRail } from "@/components/operate/MetricRail";
import { COLORS } from "@/lib/brand";
import {
  ADMIN_V4_ATTRIBUTION_CONSOLE_EMPTY,
  buildAdminAttributionV4View,
  type AdminAttributionV4AssessmentRow,
  type AdminAttributionV4ProfileRow,
} from "@/lib/v4/admin-workspace";

export const metadata: Metadata = {
  title: "Attribution | Admin | HōMI",
  description:
    "Acquisition channels from first-touch capture on profiles and assessments.",
};

export default async function AdminAttributionPage() {
  const supabase = await createClient();

  let profiles: AdminAttributionV4ProfileRow[] = [];
  let assessments: AdminAttributionV4AssessmentRow[] = [];
  let loadError = false;

  try {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("attribution, subscription_tier")
      .limit(10000);
    if (profileError) {
      loadError = true;
    } else {
      profiles = (profileData as AdminAttributionV4ProfileRow[] | null) ?? [];
    }

    const { data: assessmentData, error: assessmentError } = await supabase
      .from("assessments")
      .select("attribution")
      .eq("status", "completed")
      .limit(10000);
    if (assessmentError) {
      loadError = true;
      assessments = [];
    } else {
      assessments =
        (assessmentData as AdminAttributionV4AssessmentRow[] | null) ?? [];
    }
  } catch {
    loadError = true;
    profiles = [];
    assessments = [];
  }

  const view = buildAdminAttributionV4View({
    profiles,
    assessments,
    loadError,
  });

  return (
    <PageFrame role="admin" density="compact">
      {view.kind === "empty" ? (
        <AdminRoomEmptyV4 title={ADMIN_V4_ATTRIBUTION_CONSOLE_EMPTY} />
      ) : (
        <>
      <PageHeader
        eyebrow="Admin"
        title="Attribution"
        description="First-touch channels from live profile and assessment snapshots."
      />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Shown",
              value: String(view.shown),
              footer: "Profiles",
              color: COLORS.cyan,
            },
            {
              label: "Attributed",
              value: String(view.attributedCount),
              footer: "Known source",
              color: COLORS.emerald,
            },
            {
              label: "Assessments",
              value: String(view.assessmentCount),
              footer: "Completed with a source",
              color: COLORS.yellow,
            },
          ]}
        />
      </div>

      <div className="glass mt-6 table-scroll">
        <table className="table-premium min-w-[520px]">
          <thead>
            <tr>
              <th>Channel</th>
              <th>Signups</th>
              <th>Paid</th>
              <th>Attributed</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.channelLabel}>
                <td className="capitalize">{row.channelLabel}</td>
                <td className="text-dim">{String(row.signups)}</td>
                <td className="text-dim">{String(row.paidCount)}</td>
                <td className="text-dim">{row.attributed ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}
    </PageFrame>
  );
}
