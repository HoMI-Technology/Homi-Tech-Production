"use client";

import { useMemo, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import type { ArchitectureDocument } from "@/lib/architecture/types";
import { AGENTS } from "@/lib/agents/registry";
import { COLORS } from "@/lib/brand";

const FEED_CATEGORIES = [
  "_meta",
  "stats",
  "product_routes",
  "db_tables",
  "api_routes",
  "component_directories",
  "lib_modules",
  "ai_agents",
  "gaps",
  "calculators",
  "scoring_engine",
  "brand",
  "compliance",
] as const;

type PromptTarget = "claude" | "cursor" | "copilot";
type ScopeKey = "full" | "gaps" | "calculators" | "ai_agents" | "scoring_engine" | "brand";

const SCOPES: { id: ScopeKey; label: string; hint: string }[] = [
  { id: "full", label: "Full feed", hint: "All architecture keys" },
  { id: "gaps", label: "Gaps", hint: "Verified residual work" },
  { id: "calculators", label: "Calculators", hint: "Routes + I/O contracts" },
  { id: "ai_agents", label: "Agents", hint: "Levels + boundaries" },
  { id: "scoring_engine", label: "Scoring", hint: "Pillars + thresholds" },
  { id: "brand", label: "Brand", hint: "Voice + forbidden phrases" },
];

function feedUrlFromDoc(doc: ArchitectureDocument | null): string {
  if (doc?._meta?.feed_url) return doc._meta.feed_url;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/architecture.json`;
  }
  return "https://homitechnology.com/architecture.json";
}

function buildPrompt(target: PromptTarget, scope: ScopeKey, url: string): string {
  const preamble =
    `You are working on HōMI (Decision Readiness Intelligence). ` +
    `Fetch machine-readable architecture from ${url}. ` +
    `Executable TypeScript in the Homi-Tech-Production repo wins on conflict ` +
    `(lib/scoring, lib/brand, lib/agents/registry). ` +
    `Never invent tool paths — use calculators[].route only. ` +
    `Verdict enum stays NOT_YET; badge label is DO NOT PROCEED.`;

  const scopeLine =
    scope === "full"
      ? "Use the full JSON document."
      : `Focus on the \`${scope}\` key; skim _meta for authority notes.`;

  if (target === "claude") {
    return `${preamble}\n\n${scopeLine}\n\nAfter fetching, summarize risks and propose a minimal PR plan.`;
  }
  if (target === "cursor") {
    return `${preamble}\n\n${scopeLine}\n\nImplement only verified gaps. Run architecture:check + typecheck + vitest before claiming done.`;
  }
  return `${preamble}\n\n${scopeLine}\n\nPrefer small diffs. Do not rename VerdictKey. Do not add banned hex colors.`;
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

function toMarkdown(doc: ArchitectureDocument): string {
  const lines = [
    `# HōMI Architecture`,
    ``,
    `Generated: ${doc._meta.generated} · Feed: ${doc._meta.feed_url}`,
    ``,
    `## Stats`,
    `- Routes: ${doc.stats.product_routes}`,
    `- APIs: ${doc.stats.api_routes}`,
    `- Calculators: ${doc.stats.calculators}`,
    `- Agents: ${doc.stats.ai_agents}`,
    `- Gaps: ${doc.stats.gaps}`,
    ``,
    `## Agents`,
    ...doc.ai_agents.map((a) => `- **${a.name}** (Lv.${a.level}, ${a.mode}) — ${a.boundary}`),
    ``,
    `## Gaps`,
    ...doc.gaps.map((g) => `- **[${g.severity}]** ${g.area}: ${g.issue}`),
    ``,
    `## Calculators`,
    ...doc.calculators.map((c) => `- [${c.name}](${c.route})`),
  ];
  return lines.join("\n");
}

export function AgentHubPanel({ initialDoc }: { initialDoc: ArchitectureDocument | null }) {
  const [doc] = useState(initialDoc);
  const [copied, setCopied] = useState<"url" | "prompt" | null>(null);
  const [target, setTarget] = useState<PromptTarget>("cursor");
  const [scope, setScope] = useState<ScopeKey>("gaps");

  const url = feedUrlFromDoc(doc);
  const prompt = useMemo(() => buildPrompt(target, scope, url), [target, scope, url]);

  const copy = useCallback(async (kind: "url" | "prompt", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard may be denied */
    }
  }, []);

  return (
    <div className="space-y-8">
      {!doc && (
        <section className="rounded-2xl border border-amber/30 bg-amber/5 p-6 sm:p-8">
          <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-amber">
            Feed unavailable
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-light">
            Architecture map unavailable right now.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">
            The machine-readable snapshot (architecture.json) could not be loaded, so live stats
            and context-pack exports are disabled. The prompt builder below still targets the
            production feed URL.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber/40 px-5 py-2.5 text-sm font-semibold text-amber transition hover:bg-amber/10"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Retry
          </button>
        </section>
      )}

      {/* Feed URL */}
      <section className="relative overflow-hidden rounded-2xl border border-cyan/20 bg-gradient-to-br from-cyan/[0.07] via-navy to-emerald/[0.05] p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
          style={{ background: `radial-gradient(circle, ${COLORS.cyan}55, transparent 70%)` }}
        />
        <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-cyan">
          Agent Feed URL
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-light sm:text-3xl">
          Machine-readable architecture
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-dim">
          Any agent can fetch the live SSOT snapshot. Repo TypeScript still wins on conflict.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="flex-1 overflow-x-auto rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-cyan sm:text-sm">
            {url}
          </code>
          <button
            type="button"
            onClick={() => copy("url", url)}
            className="shrink-0 rounded-xl bg-cyan px-5 py-3 text-sm font-semibold text-navy transition hover:bg-cyan/90"
          >
            {copied === "url" ? "Copied" : "Copy URL"}
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {FEED_CATEGORIES.map((key) => (
            <span
              key={key}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-3xs text-dim"
            >
              {key}
            </span>
          ))}
        </div>
        {doc && (
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Routes", doc.stats.product_routes],
              ["APIs", doc.stats.api_routes],
              ["Agents", doc.stats.ai_agents],
              ["Gaps", doc.stats.gaps],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="rounded-xl border border-white/5 bg-black/20 px-4 py-3"
              >
                <dt className="text-3xs uppercase tracking-wider text-dim">{label}</dt>
                <dd className="mt-1 font-display text-2xl font-semibold text-light">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Prompt builder */}
      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 sm:p-8">
        <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-emerald">
          Prompt Builder
        </p>
        <h3 className="mt-2 font-display text-xl font-semibold text-light">Scoped agent brief</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["claude", "cursor", "copilot"] as PromptTarget[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                target === t
                  ? "bg-emerald/20 text-emerald ring-1 ring-emerald/40"
                  : "bg-white/5 text-dim hover:text-light"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                scope === s.id
                  ? "border-cyan/40 bg-cyan/10"
                  : "border-white/5 bg-black/20 hover:border-white/15"
              }`}
            >
              <span className="block text-sm font-semibold text-light">{s.label}</span>
              <span className="mt-0.5 block text-xs text-dim">{s.hint}</span>
            </button>
          ))}
        </div>
        <pre className="mt-5 max-h-56 overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed text-dim whitespace-pre-wrap">
          {prompt}
        </pre>
        <button
          type="button"
          onClick={() => copy("prompt", prompt)}
          className="mt-4 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-light transition hover:border-cyan/40 hover:text-cyan"
        >
          {copied === "prompt" ? "Copied prompt" : "Copy prompt"}
        </button>
      </section>

      {/* Exports + agent levels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-yellow">Exports</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-light">
            Download context packs
          </h3>
          <div className="mt-5 grid gap-3">
            <ExportButton
              title="architecture.json"
              subtitle="Full machine feed"
              disabled={!doc}
              onClick={() =>
                doc &&
                downloadText(
                  "architecture.json",
                  `${JSON.stringify(doc, null, 2)}\n`,
                  "application/json",
                )
              }
            />
            <ExportButton
              title="Claude / Cursor prompt"
              subtitle="Scoped brief as .txt"
              onClick={() => downloadText(`homi-agent-${scope}.txt`, `${prompt}\n`, "text/plain")}
            />
            <ExportButton
              title="Markdown summary"
              subtitle="Stats, agents, gaps, tools"
              disabled={!doc}
              onClick={() =>
                doc && downloadText("homi-architecture.md", toMarkdown(doc), "text/markdown")
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-amber">
            Registry levels
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold text-light">
            Unlock ladder (SSOT)
          </h3>
          <ul className="mt-5 space-y-2">
            {AGENTS.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-2.5"
              >
                <span className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                  <span className="text-sm font-medium text-light">{a.name}</span>
                  <span className="text-xs text-dim">{a.role}</span>
                </span>
                <span className="font-mono text-xs text-cyan">Lv.{a.level}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Curl recipes */}
      <section className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 font-mono text-xs text-dim">
        <p className="mb-3 text-2xs font-semibold uppercase tracking-[0.2em] text-light">
          Agent recipes
        </p>
        <p className="whitespace-pre-wrap">{`curl -s ${url} | jq '.gaps'\ncurl -s ${url} | jq '.calculators'\ncurl -s ${url} | jq '.ai_agents'`}</p>
      </section>
    </div>
  );
}

function ExportButton({
  title,
  subtitle,
  onClick,
  disabled,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-left transition hover:border-cyan/30 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>
        <span className="block text-sm font-semibold text-light">{title}</span>
        <span className="block text-xs text-dim">{subtitle}</span>
      </span>
      <span className="text-cyan">↓</span>
    </button>
  );
}
