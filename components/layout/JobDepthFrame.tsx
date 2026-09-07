import type { ReactNode } from "react";

type JobDepthWidth = "default" | "path" | "catalog";

/**
 * Quiet content column for personal job depth (JOBS_CRAFT v3).
 * Live routes only — this is padding/width, not a new URL or rail.
 */
function frameClass(width: JobDepthWidth): string {
  switch (width) {
    case "path":
      return "job-depth-frame job-depth-frame--path";
    case "catalog":
      return "job-depth-frame job-depth-frame--catalog";
    case "default":
      return "job-depth-frame";
    default: {
      const _exhaustive: never = width;
      return _exhaustive;
    }
  }
}

export function JobDepthFrame({
  children,
  job,
  width = "default",
}: {
  children: ReactNode;
  job: string;
  width?: JobDepthWidth;
}) {
  return (
    <div data-job-depth={job} className={frameClass(width)}>
      {children}
    </div>
  );
}
