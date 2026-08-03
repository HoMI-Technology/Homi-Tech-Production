"use client";

import { downloadCSV } from "@/lib/dashboard/csv";

export function CsvExportButton({
  filename,
  headers,
  rows,
  label = "Export CSV",
}: {
  filename: string;
  headers: string[];
  rows: Record<string, string>[];
  label?: string;
}) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs"
      onClick={() => downloadCSV(filename, headers, rows)}
    >
      {label}
    </button>
  );
}
