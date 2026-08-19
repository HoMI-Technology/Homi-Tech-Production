"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function DashboardFoldBeacon(props: {
  hasAssessment: number;
  hardStopCount: number;
  hasPath: number;
}): null {
  useEffect(() => {
    track("dashboard_fold_viewed", {
      has_assessment: props.hasAssessment,
      hard_stop_count: props.hardStopCount,
      has_path: props.hasPath,
    });
  }, [props.hasAssessment, props.hardStopCount, props.hasPath]);

  return null;
}
