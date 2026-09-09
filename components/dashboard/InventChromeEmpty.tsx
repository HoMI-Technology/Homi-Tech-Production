import Link from "next/link";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { FOLD_CONNECT_ACCOUNTS_LABEL, FOLD_CONNECTIONS_HREF } from "@/lib/dashboard/fold-truth";

/**
 * Honest invent-chrome empty surface. Empty or connect — never fake scores or $.
 */
export function InventChromeEmpty({
  job,
  eyebrow,
  title,
  body,
  connect = true,
}: {
  job: string;
  eyebrow: string;
  title: string;
  body: string;
  connect?: boolean;
}) {
  return (
    <div data-invent-chrome-empty="" data-invent-chrome-job={job}>
      <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-dim">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-light">{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">{body}</p>
      <div className="mt-8 max-w-md rounded-2xl border border-white/[0.06] bg-navy-light/40 p-6">
        <ThresholdCompass size={56} animated={false} glow={false} />
        <p className="mt-4 text-sm text-dim">No invented amounts on this shell.</p>
        {connect ? (
          <p className="mt-4">
            <Link
              href={FOLD_CONNECTIONS_HREF}
              className="btn rounded-full border border-cyan bg-transparent text-cyan"
            >
              {FOLD_CONNECT_ACCOUNTS_LABEL}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
