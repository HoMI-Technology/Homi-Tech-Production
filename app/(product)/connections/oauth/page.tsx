"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { LinkFlow } from "@/components/connections/PlaidLinkLauncher";
import { PLAID_LINK_TOKEN_STORAGE_KEY } from "@/lib/plaid/link-storage";
import { PageFrame } from "@/components/operate/PageFrame";

/**
 * OAuth resume. After a bank's site redirects here, Link must be opened
 * again with the same link_token plus receivedRedirectUri. Desktop pop-up
 * OAuth never hits this page.
 */

const PlaidLinkLauncher = dynamic(() => import("@/components/connections/PlaidLinkLauncher"), {
  ssr: false,
});

export default function PlaidOAuthResumePage() {
  const router = useRouter();
  const [flow, setFlow] = useState<LinkFlow | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    try {
      const token = sessionStorage.getItem(PLAID_LINK_TOKEN_STORAGE_KEY);
      if (token) {
        setFlow({ token, mode: "connect" });
        return;
      }
    } catch {
      // ignore
    }
    setNote("This bank sign-in session expired. Return to Connections and try again.");
  }, []);

  const handleSuccess = useCallback(
    async (publicToken: string) => {
      try {
        const res = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ public_token: publicToken }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (res.ok && data.ok) {
          await fetch("/api/plaid/sync", { method: "POST" }).catch(() => undefined);
          router.replace("/connections");
          return;
        }
        setNote(data.error ?? "Could not finish connecting the bank.");
      } catch {
        setNote("Could not finish connecting the bank.");
      }
    },
    [router],
  );

  return (
    <PageFrame width="focus" density="spacious" role="personal">
      <h1 className="font-display text-3xl text-light">Finishing bank connection</h1>
      <p className="mt-2 max-w-2xl text-dim">
        Returning from your bank. Keep this tab open until HōMI confirms the
        connection.
      </p>
      {flow && (
        <PlaidLinkLauncher
          flow={flow}
          onSuccess={(publicToken) => void handleSuccess(publicToken)}
          onExit={() => router.replace("/connections")}
        />
      )}
      {note && (
        <div className="glass mt-8 p-6" role="alert">
          <p className="text-sm text-dim">{note}</p>
          <a
            href="/connections"
            className="mt-4 inline-block text-cyan underline underline-offset-2"
          >
            Back to Connections
          </a>
        </div>
      )}
    </PageFrame>
  );
}
