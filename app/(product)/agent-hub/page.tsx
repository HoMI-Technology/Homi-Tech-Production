import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AgentHubPanel } from "@/components/agents/AgentHubPanel";
import type { ArchitectureDocument } from "@/lib/architecture/types";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Agent Hub",
  description:
    "Machine-readable HōMI architecture feed, prompt builder, and export packs for AI agents.",
};

async function loadArchitectureDoc(): Promise<ArchitectureDocument | null> {
  try {
    const file = path.join(process.cwd(), "public", "architecture.json");
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as ArchitectureDocument;
  } catch {
    return null;
  }
}

export default async function AgentHubPage() {
  const doc = await loadArchitectureDoc();

  return (
    <div className="relative mx-auto max-w-6xl px-6 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.12),_transparent_60%)]" />
      <div className="relative mb-10">
        <p className="text-2xs font-semibold uppercase tracking-[0.22em] text-cyan">Agent OS</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-light sm:text-4xl">
          Agent Hub
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim">
          Direct feed for Claude, Cursor, Copilot, and any scraper.{" "}
          <Link href="/agents" className="text-cyan underline-offset-2 hover:underline">
            Open the live roster
          </Link>{" "}
          when you want to talk to the ensemble.
        </p>
      </div>
      <AgentHubPanel initialDoc={doc} />
    </div>
  );
}
