import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "System status",
  description: "HōMI reliability posture and public service health.",
  alternates: { canonical: "/status" },
};

/**
 * Public status / reliability SLO surface.
 * Does not probe live deps at request time (keeps page cacheable + honest).
 * Points operators at architecture feed + healthcheck.
 */
export default function StatusPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow">Reliability</p>
      <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">
        System status
      </h1>
      <p className="mt-3 text-dim">
        Decision Readiness is designed to degrade gracefully when optional
        integrations are offline. Core assessment and Path math run without
        third-party AI or bank links.
      </p>

      <div className="mt-10 space-y-4">
        <StatusCard
          name="Assessment & scoring"
          level="SLO"
          detail="Pure TypeScript engine. Target: 99.9% successful score computation when app is up."
          status="operational"
        />
        <StatusCard
          name="Path to Ready"
          level="SLO"
          detail="Path generate/save local-first; server sync best-effort. Target: path UI usable without DB."
          status="operational"
        />
        <StatusCard
          name="Auth & database (Supabase)"
          level="dependency"
          detail="Session, assessments, household, path LWW. Degrades to localStorage where designed."
          status="operational"
        />
        <StatusCard
          name="Bank link (Plaid)"
          level="dependency"
          detail="Optional Plus+ capability. Unlinked users keep self-report confidence labels."
          status="degraded_optional"
        />
        <StatusCard
          name="Companion model (Anthropic)"
          level="dependency"
          detail="Paid real-model; free/fallback is deterministic rules. Never invents scores."
          status="degraded_optional"
        />
        <StatusCard
          name="Email (Resend)"
          level="dependency"
          detail="Household invites and lifecycle. Unconfigured = skip, not crash."
          status="degraded_optional"
        />
      </div>

      <div className="glass mt-10 p-6">
        <h2 className="font-display text-xl text-light">SLOs (product targets)</h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-dim">
          <li>
            <span className="text-light">Availability:</span> marketing + assessment
            routes 99.5% monthly (excluding scheduled maintenance).
          </li>
          <li>
            <span className="text-light">Scoring latency:</span> p95 client score
            compute &lt; 50ms for full assessment payload.
          </li>
          <li>
            <span className="text-light">Path activation:</span> auto-path offered on
            ≥95% of non-READY result views when JS loads.
          </li>
          <li>
            <span className="text-light">Error budget:</span> Path/household API 5xx
            &lt; 1% of authenticated requests (7-day).
          </li>
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link href="/api/healthcheck" className="text-cyan underline-offset-2 hover:underline">
          Healthcheck JSON
        </Link>
        <Link href="/architecture.json" className="text-cyan underline-offset-2 hover:underline">
          Architecture feed
        </Link>
        <Link href="/agent-hub" className="text-cyan underline-offset-2 hover:underline">
          Agent Hub
        </Link>
      </div>

      <p className="mt-10 text-xs text-dim">
        This page describes design targets. Live third-party incidents are published
        by those vendors. HōMI fails closed on advice claims and open on educational
        readiness.
      </p>
    </div>
  );
}

function StatusCard({
  name,
  level,
  detail,
  status,
}: {
  name: string;
  level: string;
  detail: string;
  status: "operational" | "degraded_optional";
}) {
  const label =
    status === "operational" ? "Operational design" : "Optional / degrades";
  const color =
    status === "operational" ? "text-emerald border-emerald/30" : "text-yellow border-yellow/30";
  return (
    <div className={`glass border p-5 ${color.split(" ")[1]}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg text-light">{name}</h2>
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${color.split(" ")[0]}`}>
          {label}
        </span>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-dim">{level}</p>
      <p className="mt-2 text-sm text-dim">{detail}</p>
    </div>
  );
}
