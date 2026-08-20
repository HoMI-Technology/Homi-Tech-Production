"use client";

import { useCallback, useEffect, useState } from "react";
import { COLORS } from "@/lib/brand";
import dynamic from "next/dynamic";
import type { LinkFlow } from "@/components/connections/PlaidLinkLauncher";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { PageFrame } from "@/components/operate/PageFrame";

/**
 * Bank Connections — list, connect, reconnect (Plaid Link update mode),
 * manual sync, and disconnect. Link is driven by react-plaid-link's
 * usePlaidLink hook, loaded lazily (ssr: false) so the Plaid SDK is not in
 * this page's initial bundle — its chunk loads when a Link flow starts.
 */

const PlaidLinkLauncher = dynamic(() => import("@/components/connections/PlaidLinkLauncher"), {
  ssr: false,
});

interface ConnectionAccount {
  id: string;
  account_id: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  current_balance: number | null;
  available_balance: number | null;
  iso_currency: string | null;
}

interface ConnectionItem {
  id: string;
  institution_name: string | null;
  status: "healthy" | "login_required" | "pending_disconnect" | "pending_expiration" | "revoked";
  last_successful_sync: string | null;
  accounts: ConnectionAccount[];
}

interface AccountsResponse {
  configured?: boolean;
  items?: ConnectionItem[];
  error?: string;
}

interface LinkTokenResponse {
  configured?: boolean;
  link_token?: string;
  update_mode?: boolean;
  error?: string;
}

type PageState = "loading" | "unconfigured" | "signed-out" | "ready" | "error";

function timeAgo(iso: string | null): string {
  if (!iso) return "not yet synced";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "not yet synced";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const STATUS_META: Record<
  ConnectionItem["status"],
  { label: (item: ConnectionItem) => string; tone: "ok" | "attention" | "revoked" }
> = {
  healthy: { label: (item) => `Synced ${timeAgo(item.last_successful_sync)}`, tone: "ok" },
  login_required: { label: () => "Reconnect needed", tone: "attention" },
  pending_expiration: { label: () => "Access expiring soon", tone: "attention" },
  pending_disconnect: { label: () => "Bank is disconnecting this link", tone: "attention" },
  revoked: { label: () => "Access revoked at the bank", tone: "revoked" },
};

const CHIP_TONE: Record<"ok" | "attention" | "revoked", string> = {
  ok: "border-emerald/40 text-emerald",
  attention: "border-yellow/40 text-yellow",
  revoked: "border-crimson/40 text-crimson",
};

export default function ConnectionsPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [items, setItems] = useState<ConnectionItem[]>([]);
  const [linkFlow, setLinkFlow] = useState<LinkFlow | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // "connect" | "sync:*" | "disconnect:*" | "reconnect:*"

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch("/api/plaid/accounts");
      if (res.status === 401) {
        setPageState("signed-out");
        return;
      }
      const data = (await res.json()) as AccountsResponse;
      if (!res.ok) {
        setPageState("error");
        return;
      }
      if (!data.configured) {
        setPageState("unconfigured");
        return;
      }
      setItems(data.items ?? []);
      setPageState("ready");
    } catch {
      setPageState("error");
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function requestLinkToken(itemId?: string): Promise<LinkTokenResponse | null> {
    try {
      const res = await fetch("/api/plaid/link-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(itemId ? { item_id: itemId } : {}),
      });
      const data = (await res.json()) as LinkTokenResponse;
      if (res.status === 402) {
        setNote(data.error ?? "Bank sync is part of a HōMI plan. Upgrade to unlock it.");
        return null;
      }
      if (!res.ok || !data.link_token) {
        setNote(data.error ?? "Could not start the bank connection. Try again in a moment.");
        return null;
      }
      return data;
    } catch {
      setNote("Could not start the bank connection. Try again in a moment.");
      return null;
    }
  }

  async function startConnect() {
    setNote(null);
    setBusy("connect");
    const data = await requestLinkToken();
    setBusy(null);
    if (data?.link_token) setLinkFlow({ token: data.link_token, mode: "connect" });
  }

  async function startReconnect(item: ConnectionItem) {
    setNote(null);
    // A revoked item has no live token — repair happens via a full relink,
    // which creates a fresh connection; the old row is cleaned up on disconnect.
    if (item.status === "revoked") {
      await startConnect();
      return;
    }
    setBusy(`reconnect:${item.id}`);
    const data = await requestLinkToken(item.id);
    setBusy(null);
    if (data?.link_token) setLinkFlow({ token: data.link_token, mode: "update", itemId: item.id });
  }

  async function syncNow(itemId?: string) {
    setNote(null);
    setBusy(itemId ? `sync:${itemId}` : "sync:all");
    try {
      const res = await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(itemId ? { item_id: itemId } : {}),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.status === 429) {
        setNote(data.error ?? "A sync ran recently. Give it a few minutes.");
      } else if (!res.ok) {
        setNote(data.error ?? "Sync did not complete. Try again in a moment.");
      } else if (data.ok === false) {
        setNote("Some connections could not sync. Check their status below.");
      } else {
        setNote("Sync complete.");
      }
    } catch {
      setNote("Sync did not complete. Try again in a moment.");
    }
    setBusy(null);
    await loadItems();
  }

  async function disconnect(itemId: string) {
    setNote(null);
    setBusy(`disconnect:${itemId}`);
    try {
      const res = await fetch("/api/plaid/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      setNote(
        res.ok && data.ok
          ? "Bank disconnected and its data removed from HōMI."
          : (data.error ?? "Could not disconnect. Try again in a moment."),
      );
    } catch {
      setNote("Could not disconnect. Try again in a moment.");
    }
    setBusy(null);
    await loadItems();
  }

  async function handleLinkSuccess(publicToken: string, flow: LinkFlow) {
    setLinkFlow(null);
    if (flow.mode === "update") {
      // Update mode needs NO token exchange — the existing item is repaired.
      // A sync confirms the fix and flips the status back to healthy.
      setNote("Connection repaired. Refreshing your data…");
      await syncNow(flow.itemId);
      return;
    }
    setBusy("connect");
    try {
      const res = await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ public_token: publicToken }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setNote("Bank connected. Running the first sync…");
        setBusy(null);
        await syncNow();
        return;
      }
      setNote(data.error ?? "Something went wrong completing the connection.");
    } catch {
      setNote("Something went wrong completing the connection.");
    }
    setBusy(null);
    await loadItems();
  }

  return (
    <PageFrame width="focus" density="spacious" role="personal">
      <h1 className="font-display text-3xl text-light">Bank Connections</h1>
      <p className="mt-2 max-w-2xl text-dim">
        Connect your accounts for real balance and transaction context, or enter your numbers
        manually — HōMI works either way.
      </p>

      {linkFlow && (
        <PlaidLinkLauncher
          flow={linkFlow}
          onSuccess={handleLinkSuccess}
          onExit={() => setLinkFlow(null)}
        />
      )}

      <div className="mt-8">
        {pageState === "loading" && (
          <ProductLoadingSkeleton label="Checking bank connection status" rows={3} />
        )}

        {pageState === "unconfigured" && <UnconfiguredPanel />}

        {pageState === "signed-out" && (
          <div className="glass p-6">
            <h2 className="font-semibold text-light">Sign in to manage bank connections</h2>
            <p className="mt-2 text-sm text-dim">
              Bank connections are tied to your account.{" "}
              <a href="/auth/sign-in" className="text-cyan underline underline-offset-2">
                Sign in
              </a>{" "}
              to connect a bank or manage existing connections.
            </p>
          </div>
        )}

        {pageState === "error" && (
          <div className="glass border border-crimson/25 bg-crimson/5 p-6" role="alert">
            <h2 className="font-semibold text-light">Couldn&apos;t reach bank connections</h2>
            <p className="mt-2 text-sm text-dim">
              Something went wrong checking connection status. You can still enter your numbers
              manually on the{" "}
              <a href="/money" className="text-cyan underline underline-offset-2">
                Money Stand
              </a>
              .
            </p>
            <button
              type="button"
              className="btn btn-ghost mt-4 btn-sm"
              onClick={() => {
                setPageState("loading");
                void loadItems();
              }}
            >
              Retry
            </button>
          </div>
        )}

        {pageState === "ready" && (
          <div className="space-y-6">
            {note && (
              <div
                className="glass border border-slate-surface/60 px-5 py-3 text-sm text-light"
                role="status"
              >
                {note}
              </div>
            )}

            {items.length === 0 ? (
              <div className="glass p-6">
                <h2 className="font-semibold text-light">Connect a bank</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">
                  Read-only balance and transaction context. Encrypted in transit and at rest.
                  Revocable at any time — HōMI never initiates transfers or has spending access.
                </p>
                <button
                  className="btn btn-primary mt-4"
                  onClick={startConnect}
                  disabled={busy !== null || linkFlow !== null}
                >
                  {busy === "connect" ? "Connecting…" : "Connect your bank"}
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-dim">
                    {items.length === 1 ? "1 connected bank" : `${items.length} connected banks`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-ghost btn-xs text-sm"
                      onClick={() => syncNow()}
                      disabled={busy !== null}
                    >
                      {busy === "sync:all" ? "Syncing…" : "Sync now"}
                    </button>
                    <button
                      className="btn btn-primary btn-xs text-sm"
                      onClick={startConnect}
                      disabled={busy !== null || linkFlow !== null}
                    >
                      {busy === "connect" ? "Connecting…" : "+ Add a bank"}
                    </button>
                  </div>
                </div>

                {items.map((item) => (
                  <ConnectionCard
                    key={item.id}
                    item={item}
                    busy={busy}
                    onReconnect={() => startReconnect(item)}
                    onSync={() => syncNow(item.id)}
                    onDisconnect={() => disconnect(item.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </PageFrame>
  );
}

function ConnectionCard({
  item,
  busy,
  onReconnect,
  onSync,
  onDisconnect,
}: {
  item: ConnectionItem;
  busy: string | null;
  onReconnect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const meta = STATUS_META[item.status];
  const needsAttention = item.status !== "healthy";

  return (
    <div className="glass glass-hover p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-light">{item.institution_name ?? "Connected bank"}</h2>
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${CHIP_TONE[meta.tone]}`}
          >
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {meta.label(item)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {needsAttention && (
            <button
              className="btn btn-primary btn-xs text-sm"
              onClick={onReconnect}
              disabled={busy !== null}
            >
              {busy === `reconnect:${item.id}` ? "Opening…" : "Reconnect"}
            </button>
          )}
          {item.status !== "revoked" && (
            <button
              className="btn btn-ghost btn-xs text-sm"
              onClick={onSync}
              disabled={busy !== null}
            >
              {busy === `sync:${item.id}` ? "Syncing…" : "Sync now"}
            </button>
          )}
          {confirming ? (
            <span className="inline-flex items-center gap-2">
              <button
                className="btn btn-ghost btn-xs text-sm text-crimson"
                onClick={() => {
                  setConfirming(false);
                  onDisconnect();
                }}
                disabled={busy !== null}
              >
                {busy === `disconnect:${item.id}` ? "Removing…" : "Confirm removal"}
              </button>
              <button
                className="btn btn-ghost btn-xs text-sm"
                onClick={() => setConfirming(false)}
                disabled={busy !== null}
              >
                Keep
              </button>
            </span>
          ) : (
            <button
              className="btn btn-ghost btn-xs text-sm"
              onClick={() => setConfirming(true)}
              disabled={busy !== null}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <p className="mt-3 text-xs leading-relaxed text-dim">
          Disconnecting removes this bank and its account data from HōMI and revokes our access. You
          can reconnect any time.
        </p>
      )}

      {item.accounts.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {item.accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between rounded-lg border border-slate-surface/60 p-3 text-sm"
            >
              <span className="text-light">{account.name}</span>
              <span className="score-numeral text-dim">
                {account.mask ? `•••• ${account.mask}` : (account.subtype ?? account.type)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-dim">
          {item.status === "revoked"
            ? "Account details were removed when access was revoked."
            : "No account details yet — run a sync to pull them in."}
        </p>
      )}
    </div>
  );
}

/** CL-07: honest soft-sell when Plaid env is not configured — never "coming soon" as a false promise. */
function UnconfiguredPanel() {
  return (
    <div className="glass p-8">
      <div className="flex items-center gap-3">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke={COLORS.cyan}
          strokeWidth="1.75"
        >
          <rect x="3" y="10" width="18" height="10" rx="2" />
          <path d="M7 10V7a5 5 0 0 1 10 0v3" />
        </svg>
        <h2 className="font-display text-xl text-light">Bank sync is not available here</h2>
      </div>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-dim">
        Live bank connection is not configured in this environment. HōMI does not pretend a connect
        button works when it cannot. When bank sync is enabled, it is read-only, encrypted, and
        revocable — same posture as Plus+ plans that include bank sync.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <FeatureNote
          title="Read-only"
          body="HōMI only ever reads balances and transaction history. It cannot move money, initiate payments, or change anything in your accounts."
        />
        <FeatureNote
          title="Encrypted"
          body="Connections are encrypted in transit and at rest, using the same infrastructure most financial apps rely on."
        />
        <FeatureNote
          title="Revocable"
          body="You can disconnect a bank at any time, from this page or from your bank's own security settings."
        />
      </div>

      <div className="hairline my-6" />

      <p className="text-sm text-dim">
        Enter your numbers directly on{" "}
        <a href="/money" className="text-cyan underline underline-offset-2">
          Money Stand
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
