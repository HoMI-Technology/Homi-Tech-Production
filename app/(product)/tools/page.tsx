import Link from "next/link";
import type { Metadata } from "next";
import { hubLenses } from "@/lib/tools/registry";
import { getCachedUser } from "@/lib/supabase/server";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { pageMetadata } from "@/lib/seo/metadata";
import { JobDepthFrame } from "@/components/layout/JobDepthFrame";

export const metadata: Metadata = pageMetadata({
  title: "Tools",
  description:
    "Answer one math question at a time — honest educational lenses. Estimates never write your official score.",
  path: "/tools",
});

/**
 * Tools hub — ten public lenses, equal weight (lib/tools/registry.ts).
 * Decide job primary surface. Educational only — no score write.
 */
export default async function ToolsHubPage() {
  const user = await getCachedUser();
  const signedIn = !!user;
  const lenses = hubLenses();

  return (
    <JobDepthFrame job="tools">
      <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-dim">
        Tools · educational lenses
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-light">Tools</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim" data-decide-honesty="">
        Educational estimates only — not a HōMI verdict and not a score write. Ten lenses, equal
        weight. Close language after a look: verdict unchanged, or a hard stop still on. Only a new
        assessment writes AssessmentResult.
      </p>
      {signedIn ? (
        <p className="mt-3 text-sm text-dim">
          <Link href="/money" className="text-cyan underline-offset-2 hover:underline">
            Money picture
          </Link>
          {" · "}
          <Link href="/money/decide" className="text-cyan underline-offset-2 hover:underline">
            Supporting lenses
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-sm">
          <Link href={PRIMARY_CLOSE_HREF} className="text-cyan underline-offset-2 hover:underline">
            {PRIMARY_CLOSE_LABEL}
          </Link>
        </p>
      )}

      <ol className="mt-10 divide-y divide-white/[0.06] border-y border-white/[0.06]" data-tools-hub="">
        {lenses.map((lens) => (
          <li key={lens.id} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-light">{lens.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-dim">{lens.desc}</p>
            </div>
            <Link
              href={lens.path}
              className="shrink-0 pt-0.5 text-sm text-cyan underline-offset-2 hover:underline"
            >
              Open lens
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-10 max-w-xl text-xs leading-relaxed text-dim/70">
        HōMI tools are educational. They do not provide financial, tax, mortgage, or investment
        advice. Confirm critical numbers with qualified professionals before you act. FI v2 / Monte
        Carlo is not a READY gate.
      </p>
    </JobDepthFrame>
  );
}
