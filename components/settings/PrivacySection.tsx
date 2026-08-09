"use client";

import { useState } from "react";
import { DeleteAccountModal } from "./DeleteAccountModal";

export function PrivacySection() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        setExportError("Could not export your data. Try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "homi-data-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Could not export your data. Try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">Privacy</h2>
      <p className="mt-1 text-sm text-dim">Export or permanently remove your data.</p>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-light">Export my data</p>
            <p className="text-sm text-dim">
              Download everything HōMI has stored about you as JSON.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn btn-ghost btn-sm disabled:opacity-60"
          >
            {exporting ? "Preparing…" : "Export my data"}
          </button>
        </div>
        {exportError && <p className="text-sm text-crimson">{exportError}</p>}

        <div className="hairline" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-light">Delete my account</p>
            <p className="text-sm text-dim">
              Permanently remove your account and all associated data.
            </p>
          </div>
          <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger-ghost">
            Delete my account
          </button>
        </div>
      </div>

      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
    </section>
  );
}
