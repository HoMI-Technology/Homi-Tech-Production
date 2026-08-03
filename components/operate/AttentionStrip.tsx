import Link from "next/link";

export type AttentionItem = {
  id: string;
  severity: "critical" | "warn" | "info" | "ok";
  title: string;
  detail?: string;
  href?: string;
  cta?: string;
};

const SEVERITY_STYLE: Record<AttentionItem["severity"], string> = {
  critical: "border-crimson/40 bg-crimson/10 text-light",
  warn: "border-amber/40 bg-verdict-build text-light",
  info: "border-cyan/30 bg-cyan/5 text-light",
  ok: "border-emerald/30 bg-emerald/5 text-light",
};

const DOT: Record<AttentionItem["severity"], string> = {
  critical: "bg-crimson",
  warn: "bg-amber",
  info: "bg-cyan",
  ok: "bg-emerald",
};

/**
 * Ranked “what needs attention” strip for admin (and later partner).
 * Primary operate job for ops: not equal KPI walls.
 */
export function AttentionStrip({
  items,
  title = "Needs attention",
}: {
  items: AttentionItem[];
  title?: string;
}) {
  if (items.length === 0) return null;

  const primary = items[0];
  const rest = items.slice(1, 5);

  return (
    <section className="glass panel-focus p-5 sm:p-6" aria-label={title}>
      <p className="eyebrow">{title}</p>
      <div className={`mt-3 rounded-xl border px-4 py-3 ${SEVERITY_STYLE[primary.severity]}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[primary.severity]}`}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="font-semibold text-light">{primary.title}</p>
              {primary.detail && (
                <p className="mt-1 text-sm text-dim">{primary.detail}</p>
              )}
            </div>
          </div>
          {primary.href && primary.cta && (
            <Link href={primary.href} className="btn btn-primary !px-4 !py-2 text-sm">
              {primary.cta}
            </Link>
          )}
        </div>
      </div>
      {rest.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rest.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-surface/60 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 text-dim">
                <span className={`h-1.5 w-1.5 rounded-full ${DOT[item.severity]}`} aria-hidden />
                <span className="text-light">{item.title}</span>
                {item.detail && <span className="text-dim">· {item.detail}</span>}
              </span>
              {item.href && item.cta && (
                <Link href={item.href} className="text-cyan hover:underline">
                  {item.cta}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
