"use client";

import { CopyButton } from "@/components/b2b/CopyButton";

/**
 * Mobile-first invite / share row for partner docks.
 * Full-width stack on phones; side-by-side from sm+.
 */
export function InviteShareRow({
  url,
  copyLabel = "Copy invite link",
}: {
  url: string;
  copyLabel?: string;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">
      <code
        className="block w-full min-w-0 break-all rounded-lg border border-slate-surface bg-navy-light px-3 py-2.5 font-mono text-xs text-cyan sm:flex-1 sm:truncate sm:break-normal sm:text-sm"
        title={url}
      >
        {url}
      </code>
      <CopyButton value={url} label={copyLabel} className="!min-h-11 w-full shrink-0 sm:w-auto" />
    </div>
  );
}
