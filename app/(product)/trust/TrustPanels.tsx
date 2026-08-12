"use client";

/**
 * Trust & privacy — what HōMI holds, how you take it with you, how you remove it.
 *
 * The download here is the same artifact Settings · Privacy produces, built by
 * lib/account/portability so the server payload and the money picture that only
 * exists in this browser land in one file. A second, assessments-only export
 * would have been a worse backup wearing the same word.
 *
 * Deletion is deliberately NOT actionable from here — it lives behind the
 * confirmation modal in Settings, and a second trigger for an irreversible act
 * is how people delete an account they meant to keep.
 */

import { useState } from "react";
import Link from "next/link";
import { Download, FileText, Shield, Trash2 } from "lucide-react";
import { buildExport } from "@/lib/account/portability";
import { LEGAL_DISCLAIMER } from "@/lib/brand";
import { PageFrame } from "@/components/operate/PageFrame";

export function TrustPanels() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        setError("Could not export your data. Try again.");
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
      setError("Could not export your data. Try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageFrame width="content" density="spacious" role="personal">
      <header>
        <p className="eyebrow">Trust</p>
        <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">Your data, your control</h1>
        <p className="mt-2 max-w-xl text-dim">
          What we hold, where it lives, and how to take it with you or remove it. No part of this
          requires asking us.
        </p>
      </header>

      <div className="mt-8 space-y-5">
        <Panel icon={<Shield size={18} />} title="Where your data lives">
          <p className="text-sm leading-relaxed text-dim">
            Your financial data is encrypted at rest in Supabase, and every table enforces
            row-level security — a query can only ever return your own rows. HōMI never sells your
            data and does not take commissions or referral fees from lenders, agents, or brokers.
            Your money picture in the Track workspace is stored on this device and syncs to your
            account so it survives a cleared browser.
          </p>
        </Panel>

        <Panel icon={<Download size={18} />} title="Take your data with you">
          <p className="text-sm leading-relaxed text-dim">
            One JSON file with your profile, assessments, journal and check-ins, plus the money
            picture held in this browser. Readable by you, restorable into HōMI, and yours to keep
            whether or not you stay.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="btn btn-ghost btn-sm disabled:opacity-60"
            >
              {exporting ? "Preparing…" : "Download my data"}
            </button>
            <Link href="/settings" className="text-sm text-dim transition-colors hover:text-cyan">
              Restore from a backup &rarr;
            </Link>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-crimson">
              {error}
            </p>
          )}
        </Panel>

        <Panel icon={<Trash2 size={18} />} title="Delete everything">
          <p className="text-sm leading-relaxed text-dim">
            Removing your account removes the assessments, journal entries and check-ins with it.
            There is no undo, so the control lives behind a confirmation in Settings rather than
            one click from here.
          </p>
          <Link href="/settings" className="btn btn-danger-ghost btn-sm mt-4">
            Open Settings &middot; Privacy
          </Link>
        </Panel>

        <Panel icon={<FileText size={18} />} title="The written commitments">
          <p className="text-sm leading-relaxed text-dim">
            The policies behind everything above — what we collect, who processes it on our
            behalf, and how long any of it is kept.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/legal/privacy" className="btn btn-ghost btn-sm">
              Privacy policy
            </Link>
            <Link href="/legal/subprocessors" className="btn btn-ghost btn-sm">
              Subprocessors
            </Link>
            <Link href="/legal/terms" className="btn btn-ghost btn-sm">
              Terms
            </Link>
          </div>
        </Panel>
      </div>

      <footer className="mt-10 border-t border-white/[0.06] pt-6">
        <p className="text-xs leading-relaxed text-dim">{LEGAL_DISCLAIMER}</p>
      </footer>
    </PageFrame>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass card-hairline-top p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan"
        >
          {icon}
        </span>
        <h2 className="font-display text-lg text-light">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
