"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { LinkFlow } from "@/components/connections/PlaidLinkLauncher";

const PlaidLinkLauncher = dynamic(() => import("@/components/connections/PlaidLinkLauncher"), {
  ssr: false,
});

interface LinkTokenResponse {
  configured?: boolean;
  link_token?: string;
  error?: string;
}

/**
 * Plaid connect / disconnect REUSE for Accounts v4.
 * Never invent balances on this surface.
 */
export function AccountsManageV4({
  connectLabel,
  itemIds,
}: {
  connectLabel: string;
  itemIds: readonly string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [linkFlow, setLinkFlow] = useState<LinkFlow | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  async function startConnect() {
    setNote(null);
    setBusy("connect");
    try {
      const res = await fetch("/api/plaid/link-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as LinkTokenResponse;
      if (!res.ok || !data.link_token) {
        setNote(data.error ?? "Could not start the bank connection.");
        return;
      }
      setLinkFlow({ token: data.link_token, mode: "connect" });
    } catch {
      setNote("Could not start the bank connection.");
    } finally {
      setBusy(null);
    }
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
          : (data.error ?? "Could not disconnect."),
      );
      setConfirmId(null);
      refresh();
    } catch {
      setNote("Could not disconnect.");
    } finally {
      setBusy(null);
    }
  }

  async function handleLinkSuccess(publicToken: string, flow: LinkFlow) {
    setLinkFlow(null);
    if (flow.mode === "update") {
      setNote("Connection repaired.");
      refresh();
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
      setNote(
        res.ok && data.ok
          ? "Bank connected. Refreshing live rows…"
          : (data.error ?? "Something went wrong completing the connection."),
      );
      refresh();
    } catch {
      setNote("Something went wrong completing the connection.");
    } finally {
      setBusy(null);
    }
  }

  const uniqueItems = [...new Set(itemIds.filter(Boolean))];

  return (
    <div className="v4-system-manage" data-accounts-v4-manage="">
      {linkFlow ? (
        <PlaidLinkLauncher
          flow={linkFlow}
          onSuccess={handleLinkSuccess}
          onExit={() => setLinkFlow(null)}
        />
      ) : null}
      {note ? (
        <p className="v4-system-honesty" role="status">
          {note}
        </p>
      ) : null}
      {uniqueItems.length > 0 ? (
        <ul className="v4-system-manage-list">
          {uniqueItems.map((itemId) => (
            <li key={itemId}>
              {confirmId === itemId ? (
                <span className="v4-system-manage-confirm">
                  <button
                    type="button"
                    className="v4-system-text-action"
                    data-accounts-v4-disconnect=""
                    onClick={() => disconnect(itemId)}
                    disabled={busy !== null}
                  >
                    {busy === `disconnect:${itemId}` ? "Removing…" : "Confirm removal"}
                  </button>
                  <button
                    type="button"
                    className="v4-system-text-action"
                    onClick={() => setConfirmId(null)}
                    disabled={busy !== null}
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="v4-system-text-action"
                  onClick={() => setConfirmId(itemId)}
                  disabled={busy !== null}
                >
                  Disconnect
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="v4-system-actions">
        <button
          type="button"
          className="btn btn-primary v4-hero-primary"
          data-accounts-v4-connect=""
          onClick={startConnect}
          disabled={busy !== null || linkFlow !== null}
        >
          {busy === "connect" ? "Connecting…" : connectLabel}
        </button>
      </div>
    </div>
  );
}
