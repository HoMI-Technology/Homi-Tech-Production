import type { Metadata } from "next";
import { ArtifactPlayground } from "@/components/marketing/ArtifactPlayground";

export const metadata: Metadata = {
  title: "Connected companion — test environment",
  description:
    "An internal test environment for the HōMI Decision Companion, wired to a fixed mock context.",
  robots: { index: false, follow: false },
};

/**
 * Public but noindex test environment for exercising the Decision Companion
 * against a fixed mock context, without needing a real assessment or
 * signed-in session. Deliberately unlinked: the old footer "Companion
 * Playground" link was removed per AUDIT-2026-07-08 T2.8 (internal test
 * environment, keep the route but not in public chrome) — reachable by
 * direct URL only.
 */
export default function ArtifactPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="type-h2">Connected companion — test environment</h1>
      <p className="mt-2 max-w-2xl text-dim">
        A fixed mock context on the left, the live Decision Companion on the right. Nothing here is
        saved.
      </p>
      <div className="mt-8">
        <ArtifactPlayground />
      </div>
    </div>
  );
}
