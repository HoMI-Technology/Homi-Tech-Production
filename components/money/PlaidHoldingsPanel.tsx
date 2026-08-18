"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/tools/format";
import {
  holdingLabel,
  summarizePlaidHoldings,
  type PlaidHoldingView,
} from "@/lib/plaid/holdings-view";

interface HoldingsResponse {
  configured?: boolean;
  holdings?: PlaidHoldingView[];
  error?: string;
}

interface IdentityOwner {
  account_id: string;
  display_name: string | null;
  initials: string | null;
  city: string | null;
  region: string | null;
}

interface IdentityResponse {
  configured?: boolean;
  owners?: IdentityOwner[];
  error?: string;
}

interface LiabilityRow {
  account_id: string;
  kind: string;
  payload: Record<string, unknown>;
  updated_at: string;
}

interface LiabilitiesResponse {
  configured?: boolean;
  liabilities?: LiabilityRow[];
  error?: string;
}

type LoadState = "loading" | "signed-out" | "upgrade" | "unconfigured" | "ready" | "error";

export function PlaidHoldingsPanel() {
  const [state, setState] = useState<LoadState>("loading");
  const [holdings, setHoldings] = useState<PlaidHoldingView[]>([]);
  const [owners, setOwners] = useState<IdentityOwner[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityRow[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setNote(null);
    try {
      const [holdingsRes, identityRes, liabRes] = await Promise.all([
        fetch("/api/plaid/holdings"),
        fetch("/api/plaid/identity"),
        fetch("/api/plaid/liabilities"),
      ]);
      if (holdingsRes.status === 401) {
        setState("signed-out");
        return;
      }
      if (holdingsRes.status === 402) {
        setState("upgrade");
        return;
      }
      const holdingsJson = (await holdingsRes.json()) as HoldingsResponse;
      const identityJson = (await identityRes.json()) as IdentityResponse;
      const liabJson = (await liabRes.json()) as LiabilitiesResponse;
      if (!holdingsRes.ok) {
        setState("error");
        setNote(holdingsJson.error ?? "Could not load linked holdings.");
        return;
      }
      if (holdingsJson.configured === false) {
        setState("unconfigured");
        return;
      }
      setHoldings(holdingsJson.holdings ?? []);
      setOwners(identityJson.owners ?? []);
      setLiabilities(liabJson.liabilities ?? []);
      setState("ready");
    } catch {
      setState("error");
      setNote("Could not load linked holdings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => summarizePlaidHoldings(holdings), [holdings]);
  const owner = owners[0];

  return (
    <section className="card-chrome p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-light">Linked accounts</h2>
          <p className="mt-0.5 max-w-md text-xs leading-relaxed text-dim">
            Verified positions from the institutions you connected. Educational
            guidance only — HōMI does not move money or tell you to buy or sell.
          </p>
        </div>
        <Link href="/connections" className="btn btn-primary btn-sm">
          Manage connections
        </Link>
      </div>

      {state === "loading" && (
        <p className="mt-4 text-sm text-dim">Checking linked brokerage and bank data…</p>
      )}

      {state === "signed-out" && (
        <p className="mt-4 text-sm text-dim">
          <Link href="/auth/sign-in?next=/money/investments" className="text-cyan underline">
            Sign in
          </Link>{" "}
          to see verified holdings.
        </p>
      )}

      {state === "upgrade" && (
        <p className="mt-4 text-sm text-dim">
          Bank and brokerage sync is part of a HōMI plan.{" "}
          <Link href="/pricing" className="text-cyan underline">
            See plans
          </Link>
          .
        </p>
      )}

      {state === "unconfigured" && (
        <p className="mt-4 text-sm text-dim">
          Live bank connection is not configured in this environment.
        </p>
      )}

      {state === "error" && <p className="mt-4 text-sm text-dim">{note}</p>}

      {state === "ready" && (
        <div className="mt-4 space-y-4">
          {owner?.display_name && (
            <p className="text-xs text-dim">
              On file as {owner.display_name}
              {owner.city ? ` · ${owner.city}` : ""}
              {owner.region ? `, ${owner.region}` : ""}
            </p>
          )}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-3.5 py-3">
              <p className="text-label">Linked market value</p>
              <p className="num-money mt-1 font-display text-lg font-semibold tnum text-cyan">
                {formatCurrency(summary.marketValue, { decimals: 2 })}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-3.5 py-3">
              <p className="text-label">Positions</p>
              <p className="num mt-1 font-display text-lg font-semibold tnum text-light">
                {summary.positionCount}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-3.5 py-3">
              <p className="text-label">Liabilities on file</p>
              <p className="num mt-1 font-display text-lg font-semibold tnum text-light">
                {liabilities.length}
              </p>
            </div>
          </div>

          {holdings.length === 0 ? (
            <p className="text-sm text-dim">
              No brokerage positions yet. Connect a broker on{" "}
              <Link href="/connections" className="text-cyan underline">
                Connections
              </Link>{" "}
              and run Sync now.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {holdings.map((row) => (
                <li
                  key={`${row.account_id}-${row.security_id}`}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-light">
                      {holdingLabel(row)}
                    </p>
                    <p className="text-xs text-dim">
                      {row.quantity ?? "—"} · {row.security?.type ?? "holding"}
                    </p>
                  </div>
                  <p className="num-money shrink-0 font-display text-sm font-semibold tnum text-cyan">
                    {formatCurrency(Number(row.institution_value) || 0, { decimals: 2 })}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {liabilities.length > 0 && (
            <ul className="space-y-1.5">
              {liabilities.map((row) => (
                <li key={row.account_id} className="text-xs text-dim">
                  {row.kind} · {row.account_id.slice(-4)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
