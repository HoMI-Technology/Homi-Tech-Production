"use client";

import { track } from "@/lib/analytics";

/** Prints the current page (the credential itself) rather than navigating away to the full report's print route. */
export function CredentialPrintButton() {
  return (
    <button
      type="button"
      onClick={() => {
        track("report_pdf", { kind: "credential" });
        window.print();
      }}
      className="btn btn-primary print:hidden"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 6V2h8v4M4 11h8v3H4v-3zM2 6h12v5H2V6z" />
      </svg>
      Download PDF
    </button>
  );
}
