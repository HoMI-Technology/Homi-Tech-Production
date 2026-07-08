import Link from "next/link";

/** Shown instead of a portal dashboard when the signed-in user lacks the required role. */
export function AccessPanel({
  title,
  body,
  href,
  linkLabel,
}: {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-6 py-20">
      <div className="glass w-full p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-surface">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-cyan">
            <rect x="4" y="9" width="12" height="8" rx="1.5" />
            <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" />
          </svg>
        </div>
        <h1 className="mt-5 font-display text-2xl text-light">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">{body}</p>
        <div className="mt-8">
          <Link href={href} className="btn btn-primary">
            {linkLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
