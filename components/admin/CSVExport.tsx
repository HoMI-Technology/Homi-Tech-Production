"use client";

import { useState } from "react";
import { downloadCSV } from "@/lib/admin/csv-export";

type ExportType = "signups" | "assessments" | "payments";

interface CSVExportProps {
  getData: (type: ExportType) => Promise<Record<string, unknown>[]>;
}

export function CSVExport({ getData }: CSVExportProps) {
  const [exporting, setExporting] = useState<ExportType | null>(null);

  const handleExport = async (type: ExportType) => {
    setExporting(type);
    try {
      const data = await getData(type);
      if (data.length > 0) downloadCSV(`homi-${type}`, data);
    } finally { setExporting(null); }
  };

  const buttons: { type: ExportType; label: string }[] = [
    { type: "signups", label: "Signups" },
    { type: "assessments", label: "Assessments" },
    { type: "payments", label: "Payments" },
  ];

  return (
    <div className="glass p-6">
      <p className="eyebrow">Export</p>
      <h3 className="mt-2 font-display text-lg text-light">Download data</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {buttons.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => handleExport(type)}
            disabled={exporting === type}
            className="btn btn-ghost !px-4 !py-2 text-sm"
          >
            {exporting === type ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30 10" />
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 8h12M8 2v12" />
                </svg>
                {label}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
