import type { ReactNode } from "react";

/**
 * Quiet content column for personal job depth (JOBS_CRAFT v3).
 * Live routes only — this is padding/width, not a new URL or rail.
 */
export function JobDepthFrame({
  children,
  job,
  width = "default",
}: {
  children: ReactNode;
  job: string;
  width?: "default" | "path";
}) {
  return (
    <div
      data-job-depth={job}
      className={width === "path" ? "job-depth-frame job-depth-frame--path" : "job-depth-frame"}
    >
      {children}
    </div>
  );
}
