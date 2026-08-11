"use client";

import { useRef, useState } from "react";
import { DeleteAccountModal } from "./DeleteAccountModal";
import {
  buildExport,
  parseImport,
  restoreLocalMoney,
  collectLocalMoney,
} from "@/lib/account/portability";

export function PrivacySection() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * The server export covers profile, assessments, journal and check-ins. The
   * money picture lives in this browser, so it is folded in here — otherwise
   * the download is not a backup of the part that has no other copy.
   */
  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        setExportError("Could not export your data. Try again.");
        return;
      }
      const server: unknown = await res.json();
      const payload = buildExport(server, new Date().toISOString());

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
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

  async function handleImportFile(file: File) {
    setImportError(null);
    setImportNote(null);

    const parsed = parseImport(await file.text());
    if (!parsed.ok) {
      setImportError(parsed.error);
      return;
    }

    // Restoring replaces the money picture in this browser. Say so plainly
    // before doing it — there is no undo once storage is overwritten.
    const hasExisting = Object.keys(collectLocalMoney()).length > 0;
    if (hasExisting) {
      const stamp = parsed.data.exportedAt
        ? parsed.data.exportedAt.slice(0, 10)
        : "an earlier date";
      const ok = window.confirm(
        `Replace the money data in this browser with the backup from ${stamp}? ` +
          `Anything you have entered since will be lost.`,
      );
      if (!ok) return;
    }

    const result = restoreLocalMoney(parsed.data.localMoney);

    if (result.failed.length > 0) {
      setImportError(
        `Your browser refused to save the ${result.failed.join(" and ")}. ` +
          `Private browsing blocks storage — try again in a normal window.`,
      );
      return;
    }

    setImportNote(`Restored your ${result.restored.join(" and ")}. Reload to see it.`);
  }

  return (
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">Privacy</h2>
      <p className="mt-1 text-sm text-dim">Take your data with you, bring it back, or remove it.</p>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-light">Export my data</p>
            <p className="text-sm text-dim">
              Your account data and the money picture stored in this browser, as one JSON file.
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
            <p className="text-sm font-medium text-light">Restore from a backup</p>
            <p className="text-sm text-dim">
              Load a HōMI export back into this browser. Replaces the money data stored here.
            </p>
          </div>
          <button onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-sm">
            Choose file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Choose a HōMI export file to restore"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Reset first so choosing the same file twice still fires.
              e.target.value = "";
              if (file) void handleImportFile(file);
            }}
          />
        </div>
        {importError && <p className="text-sm text-crimson">{importError}</p>}
        {importNote && <p className="text-sm text-emerald">{importNote}</p>}

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
