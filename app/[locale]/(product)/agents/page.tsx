import type { Metadata } from "next";
import { AgentRoster } from "@/components/agents/AgentRoster";

export const metadata: Metadata = {
  title: "AI Agents",
  description: "Meet your team of HōMI decision readiness agents.",
};

export default function AgentsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-light sm:text-4xl">
          AI Agents
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-dim">
          A team of specialists for your decision readiness. Homie coordinates; the others
          bring their own lens. Sentinel watches every exchange for safety.
        </p>
      </div>
      <AgentRoster />
    </div>
  );
}
