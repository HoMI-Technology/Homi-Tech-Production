"use client";

import { useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import { PLAID_LINK_TOKEN_STORAGE_KEY } from "@/lib/plaid/link-storage";

/**
 * Mounted only while a Link session is active — usePlaidLink requires the
 * token at hook time, so the hook lives in its own short-lived component.
 *
 * This file is loaded via next/dynamic (ssr: false) so react-plaid-link
 * stays OUT of the /connections initial client bundle: its chunk is fetched
 * only when the user actually starts a connect/reconnect flow.
 */

export interface LinkFlow {
  token: string;
  mode: "connect" | "update";
  itemId?: string;
}

export default function PlaidLinkLauncher({
  flow,
  onSuccess,
  onExit,
}: {
  flow: LinkFlow;
  onSuccess: (publicToken: string, flow: LinkFlow) => void;
  onExit: () => void;
}) {
  const receivedRedirectUri =
    typeof window !== "undefined" && window.location.search.includes("oauth_state_id")
      ? window.location.href
      : undefined;

  const { open, ready } = usePlaidLink({
    token: flow.token,
    receivedRedirectUri,
    // react-plaid-link v5 widened public_token to `string | null` — flows that
    // hand back no token have nothing to exchange, so treat them as an exit.
    onSuccess: (publicToken) => (publicToken === null ? onExit() : onSuccess(publicToken, flow)),
    onExit: () => onExit(),
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(PLAID_LINK_TOKEN_STORAGE_KEY, flow.token);
    } catch {
      // Private mode can throw; OAuth resume then falls back to a new Link.
    }
  }, [flow.token]);

  useEffect(() => {
    if (ready) open();
  }, [ready, open]);

  return null;
}
