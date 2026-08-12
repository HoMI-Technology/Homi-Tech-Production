import Link from "next/link";
import type { LibrarySection } from "@/lib/admin/marketing-command";

export function MarketingLibrary({ sections }: { sections: LibrarySection[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.id}>
          <div className="mb-3">
            <p className="text-3xs font-semibold uppercase tracking-wide text-dim">{section.title}</p>
            <p className="mt-0.5 text-xs text-dim">{section.subtitle}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => {
              const className =
                "glass-hover block rounded-lg border border-white/5 p-3.5 transition-colors";
              const body = (
                <>
                  <p className="text-sm font-medium text-light">{item.label}</p>
                  <p className="mt-1 text-xs text-dim">{item.hint}</p>
                </>
              );
              if (item.external) {
                return (
                  <a
                    key={item.href + item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={className}
                  >
                    {body}
                  </a>
                );
              }
              return (
                <Link key={item.href + item.label} href={item.href} className={className}>
                  {body}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
