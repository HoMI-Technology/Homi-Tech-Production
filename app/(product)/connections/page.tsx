"use client";

import { useEffect, useState } from "react";

interface LinkTokenResponse {
  configured: boolean;
  link_token?: string;
  error?: string;
}

interface PlaidAccount {
  id: string;
  name: string;
  mask?: string;
  type?: string;
}

interface AccountsResponse {
  configured: boolean;
  accounts: PlaidAccount[];
}

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string;
        onSuccess: (public_token: string) => void;
        onExit?: () => void;
      }) => { open: () => void };
    };
  }
}

const PLAID_SCRIPT_SRC = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";

export default function ConnectionsPage() {
  const [status, setStatus] = useState<"loading" | "unconfigured" | "ready" | "error">("loading");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [exchangeNote, setExchangeNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch("/api/plaid/link-token");
        const data = (await res.json()) as LinkTokenResponse;
        if (cancelled) return;

        if (!data.configured) {
          setStatus("unconfigured");
          return;
        }
        if (!data.link_token) {
          setStatus("error");
          return;
        }
        setLinkToken(data.link_token);
        setStatus("ready");

        const accountsRes = await fetch("/api/plaid/accounts");
        const accountsData = (await accountsRes.json()) as AccountsResponse;
        if (!cancelled) setAccounts(accountsData.accounts ?? []);
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  function loadPlaidScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Plaid) {
        resolve();
        return;
      }
      const existing = document.querySelector(`script[src="${PLAID_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Failed to load Plaid Link.")));
        return;
      }
      const script = document.createElement("script");
      script.src = PLAID_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Plaid Link."));
      document.body.appendChild(script);
    });
  }

  async function handleConnect() {
    if (!linkToken) return;
    setConnecting(true);
    setExchangeNote(null);
    try {
      await loadPlaidScript();
      if (!window.Plaid) throw new Error("Plaid Link unavailable.");

      const handlerInstance = window.Plaid.create({
        token: linkToken,
        onSuccess: async (publicToken: string) => {
          try {
            const res = await fetch("/api/plaid/exchange", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ public_token: publicToken }),
            });
            const data = (await res.json()) as { ok?: boolean; note?: string; error?: string };
            setExchangeNote(data.ok ? "Bank connection received." : data.error ?? "Something went wrong.");
          } catch {
            setExchangeNote("Something went wrong completing the connection.");
          } finally {
            setConnecting(false);
          }
        },
        onExit: () => setConnecting(false),
      });
      handlerInstance.open();
    } catch {
      setConnecting(false);
      setExchangeNote("Could not open Plaid Link.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-3xl text-light">Bank Connections</h1>
      <p className="mt-2 max-w-2xl text-dim">
        Connect your accounts for real balance and transaction context, or enter your numbers manually — HōMI
        works either way.
      </p>

      <div className="mt-8">
        {status === "loading" && (
          <div className="glass p-6 text-sm text-dim">Checking bank connection status…</div>
        )}

        {status === "unconfigured" && <ComingSoonPanel />}

        {status === "error" && (
          <div className="glass border bg-verdict-notyet p-6">
            <h2 className="font-semibold text-light">Couldn't reach bank connections</h2>
            <p className="mt-2 text-sm text-dim">
              Something went wrong checking connection status. You can still enter your numbers manually on the{" "}
              <a href="/finance" className="text-cyan underline underline-offset-2">
                Finance dashboard
              </a>
              .
            </p>
          </div>
        )}

        {status === "ready" && (
          <div className="space-y-6">
            <div className="glass p-6">
              <h2 className="font-semibold text-light">Connect a bank</h2>
              <p className="mt-2 text-sm leading-relaxed text-dim">
                Read-only balance and transaction context. Encrypted in transit. Revocable at any time — HōMI
                never initiates transfers or has spending access.
              </p>
              <button className="btn btn-primary mt-4" onClick={handleConnect} disabled={connecting}>
                {connecting ? "Connecting…" : "Connect your bank"}
              </button>
              {exchangeNote && <p className="mt-3 text-sm text-dim">{exchangeNote}</p>}
            </div>

            <div className="glass p-6">
              <h2 className="font-semibold text-light">Connected accounts</h2>
              {accounts.length === 0 ? (
                <p className="mt-2 text-sm text-dim">
                  No accounts connected yet. Once you connect a bank, accounts will appear here.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {accounts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-lg border border-slate-surface/60 p-3 text-sm">
                      <span className="text-light">{a.name}</span>
                      <span className="text-dim">{a.mask ? `•••• ${a.mask}` : a.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ComingSoonPanel() {
  return (
    <div className="glass p-8">
      <div className="flex items-center gap-3">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.75">
          <rect x="3" y="10" width="18" height="10" rx="2" />
          <path d="M7 10V7a5 5 0 0 1 10 0v3" />
        </svg>
        <h2 className="font-display text-xl text-light">Bank sync is coming</h2>
      </div>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-dim">
        HōMI will soon connect directly to your bank for real-time balance and transaction context — no more
        typing numbers in by hand. Here's what that will look like:
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <FeatureNote
          title="Read-only"
          body="HōMI will only ever read balances and transaction history. It cannot move money, initiate payments, or change anything in your accounts."
        />
        <FeatureNote
          title="Encrypted"
          body="Connections are encrypted in transit and at rest, using the same bank-grade infrastructure most financial apps rely on."
        />
        <FeatureNote
          title="Revocable"
          body="You can disconnect a bank at any time, from this page or from your bank's own security settings."
        />
      </div>

      <div className="hairline my-6" />

      <p className="text-sm text-dim">
        In the meantime, you can enter your numbers directly on the{" "}
        <a href="/finance" className="text-cyan underline underline-offset-2">
          Finance dashboard
        </a>{" "}
        — everything there works fully without a bank connection.
      </p>
    </div>
  );
}

function FeatureNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-surface/60 p-4">
      <h3 className="text-sm font-semibold text-light">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-dim">{body}</p>
    </div>
  );
}
