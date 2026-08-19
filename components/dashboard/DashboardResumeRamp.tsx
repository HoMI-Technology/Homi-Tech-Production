"use client";

import { useEffect, useState } from "react";
import { loadDraft } from "@/lib/assessment/draft";
import { resumeDraftCopy } from "@/lib/dashboard/fold-truth";
import {
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL,
} from "@/components/marketing/first-moment-copy";
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

  return (
    <EmptyState
      preset="dashboard"
      actionHref={PRIMARY_CLOSE_HREF}
      actionLabel={PRIMARY_CLOSE_LABEL}
    />
  );
}
