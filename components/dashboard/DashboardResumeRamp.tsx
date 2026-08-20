"use client";

import { useEffect, useState } from "react";
import { loadDraft } from "@/lib/assessment/draft";
import { resumeDraftCopy } from "@/lib/dashboard/fold-truth";
import { EmptyState } from "@/components/ui/EmptyState";

export function DashboardResumeRamp() {
  const [copy, setCopy] = useState<ReturnType<typeof resumeDraftCopy>>(null);

  useEffect(() => {
    setCopy(resumeDraftCopy(loadDraft()));
  }, []);

  if (copy) {
    return (
      <EmptyState
        title="The build is where you left it"
        body={copy.body}
        actionHref={copy.href}
        actionLabel={copy.label}
      />
    );
  }

  // EmptyState preset="dashboard" already points at SIGNED_IN_ASSESS_HREF.
  return <EmptyState preset="dashboard" />;
}
