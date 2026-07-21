"use client";

import { useState, useEffect } from "react";

interface HealthStatus {
  status: string;
  latency: number;
  migrations: number;
  timestamp: string;
}

export function SystemHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const start = performance.now();
        const res = await fetch("/api/healthcheck", { cache: "no-store" });
        const latency = Math.round(performance.now() - start);

        if (!res.ok) { setError(`HTTP ${res.status}`); return; }

        const data = await res.json();
        setHealth({
          status: data.status ?? "unknown",
          latency,
          migrations: data.migrations ?? 0,
          timestamp: new Date().toISOString(),
        });
      } catch { setError(" unreachable"); }
      finally { setLoading(false); }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="glass p-6">
        <p className="eyebrow">System</p>
        <p className="mt-2 text-sm text-dim">Checking health...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-6" style={{ borderColor: "rgba(242, 72, 34, 0.3)" }}>
        <p className="eyebrow" style={{ color: "#f24822" }}>System</p>
        <p className="mt-2 text-sm text-light">API{error}</p>
        <p className="mt-1 text-xs text-dim">Health check endpoint not responding.</p>
      </div>
    );
  }

  const statusColor =
    health?.status === "healthy" ? "#34d399" : health?.status === "degraded" ? "#facc15" : "#f24822";

  return (
    <div className="glass p-6">
      <p className="eyebrow">System health</p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-dim">Status</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-medium text-light">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor }} />
            {health?.status ?? "unknown"}
          </p>
        </div>
        <div>
          <p className="text-xs text-dim">API latency</p>
          <p className="score-numeral mt-1 text-sm text-light">{health?.latency ?? "—"}<span className="ml-1 text-xs text-dim">ms</span></p>
        </div>
        <div>
          <p className="text-xs text-dim">Migrations</p>
          <p className="score-numeral mt-1 text-sm text-light">{health?.migrations ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-dim">Checked</p>
          <p className="mt-1 text-xs text-dim">{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : "—"}</p>
        </div>
      </div>
    </div>
  );
}
