"use client";

import { useEffect, useState } from "react";

import { COLORS } from "@/lib/brand";

type HealthPayload = {
  ok?: boolean;
  database?: "ok" | "error";
  latencyMs?: number;
  version?: string;
  status?: string;
};

export function SystemHealthCard() {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [clientMs, setClientMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const start = performance.now();
        const res = await fetch("/api/healthcheck", { cache: "no-store" });
        const ms = Math.round(performance.now() - start);
        const body = (await res.json()) as HealthPayload;
        if (cancelled) return;
        setClientMs(ms);
        setPayload(body);
        const healthy =
          res.ok && (body.ok === true || body.database === "ok" || body.status === "healthy");
        setState(healthy ? "ok" : "error");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const accent = state === "ok" ? COLORS.emerald : state === "error" ? COLORS.crimson : COLORS.dim;
  const label = state === "loading" ? "Checking…" : state === "ok" ? "Healthy" : "Degraded";

  return (
    <div className="glass p-6">
      <p className="eyebrow">Ops</p>
      <h2 className="mt-1 font-semibold text-light">System health</h2>
      <div className="mt-4 flex items-center gap-3">
        <span
          aria-hidden
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
        />
        <span className="text-sm font-medium text-light">{label}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-dim">
        <div>
          <dt>Database</dt>
          <dd className="mt-0.5 text-sm text-light">
            {payload?.database ?? (state === "loading" ? "…" : "unreachable")}
          </dd>
        </div>
        <div>
          <dt>Latency</dt>
          <dd className="mt-0.5 text-sm text-light">
            {payload?.latencyMs != null
              ? `${payload.latencyMs} ms`
              : clientMs != null
                ? `${clientMs} ms`
                : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt>Build</dt>
          <dd className="mt-0.5 truncate font-mono text-sm text-light" title={payload?.version}>
            {payload?.version ?? "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
