import type { Metadata } from "next";
import { AgentRoster } from "@/components/agents/AgentRoster";
import { PageFrame } from "@/components/operate/PageFrame";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Agents",
  description: "Meet your team of HōMI decision readiness agents.",
};

export default function AgentsPage() {
  return (
    <PageFrame width="content" density="spacious" role="personal">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-light sm:text-4xl">
            AI Agents
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-dim">
            A team of specialists for your decision readiness. Homie coordinates; the others
            bring their own lens. Sentinel watches every exchange for safety.
          </p>
        </div>
        <Link
          href="/agent-hub"
          className="inline-flex items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-2.5 text-sm font-semibold text-cyan transition hover:bg-cyan/20"
        >
          Agent Hub · architecture feed
        </Link>
      </div>
      <AgentRoster />
    </PageFrame>
  );
}
