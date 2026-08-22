"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { AGENTS, type AgentId, type AgentMode } from "@/lib/agents/registry";
import { AgentChat } from "./AgentChat";

const MODE_FOR_AGENT: Record<AgentId, AgentMode> = {
  homie: "explore",
  scout: "compare",
  analyst: "analyze",
  coach: "decompress",
  architect: "plan",
  oracle: "simulate",
  sentinel: "explore",
};

function AgentAvatar({
  id,
  color,
  size,
}: {
  id: AgentId;
  color: string;
  size: "sm" | "lg";
}) {
  const box =
    size === "sm"
      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
      : "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl";
  return (
    <div
      className={box}
      style={
        size === "sm"
          ? { backgroundColor: `${color}15` }
          : { backgroundColor: `${color}15`, boxShadow: `0 0 24px ${color}20` }
      }
    >
      {id === "sentinel" ? (
        <Shield
          className={size === "sm" ? "h-5 w-5" : "h-7 w-7"}
          style={{ color }}
          aria-hidden
        />
      ) : (
        id[0].toUpperCase()
      )}
    </div>
  );
}

export function AgentRoster() {
  const [selected, setSelected] = useState<AgentId>("homie");
  const [mode, setMode] = useState<AgentMode>("explore");
  const [primary, setPrimary] = useState<AgentId>("homie");

  const agent = AGENTS.find((a) => a.id === selected)!;

  function selectAgent(id: AgentId) {
    setSelected(id);
    setMode(MODE_FOR_AGENT[id]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Agent list */}
      <div className="space-y-2 lg:col-span-1">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => selectAgent(a.id)}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
              selected === a.id
                ? "border-cyan/40 bg-cyan/5"
                : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/5"
            }`}
          >
            <AgentAvatar id={a.id} color={a.color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-light">{a.name}</span>
                {primary === a.id && (
                  <span className="rounded bg-emerald/10 px-1.5 py-0.5 text-3xs font-bold uppercase text-emerald">
                    Primary
                  </span>
                )}
              </div>
              <span className="text-xs text-dim">{a.role}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Detail + chat */}
      <div className="lg:col-span-2">
        <div className="glass mb-4 rounded-xl border border-white/5 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <AgentAvatar id={agent.id} color={agent.color} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-semibold text-light">{agent.name}</h2>
              <span
                className="inline-block rounded px-2 py-0.5 text-xs font-bold"
                style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
              >
                {agent.role}
              </span>
              <p className="mt-2 text-sm text-dim leading-relaxed">{agent.description}</p>

              <div className="mt-4 flex items-center gap-3">
                {agent.id === "sentinel" ? (
                  <span className="text-xs font-semibold text-crimson">● Always active</span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setPrimary(agent.id)}
                      className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                        primary === agent.id
                          ? "border border-emerald/30 bg-emerald/10 text-emerald"
                          : "bg-cyan text-navy hover:bg-cyan/90"
                      }`}
                    >
                      {primary === agent.id ? "✓ Primary" : "Set as Primary"}
                    </button>
                    <span className="text-xs font-semibold text-emerald">● Available</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {agent.id === "sentinel" && (
            <div className="mt-4 rounded-xl border border-crimson/20 bg-crimson/5 p-4">
              <h3 className="text-sm font-bold text-crimson">Always Active</h3>
              <p className="mt-1 text-xs leading-relaxed text-crimson/80">
                Sentinel operates independently of all other agents. It monitors every interaction
                for safety, bias, and compliance. Cannot be disabled or bypassed.
              </p>
            </div>
          )}
        </div>

        <AgentChat mode={mode} onModeChange={setMode} />
      </div>
    </div>
  );
}
