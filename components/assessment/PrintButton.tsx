"use client";

import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";

/** Links to the print-optimized report route, which triggers the browser print dialog on load. */
export function PrintButton({ assessmentId }: { assessmentId: string }) {
  return (
    <Link
      href={`/report/${assessmentId}/print`}
      onClick={() => track("report_pdf", { kind: "report" })}
      className="btn btn-primary print:hidden"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 6V2h8v4M4 11h8v3H4v-3zM2 6h12v5H2V6z" />
      </svg>
      Download PDF
    </Link>
  );
}
