import "server-only";

/**
 * Small fetch helper for the Plaid API.
 * Base URL is derived from PLAID_ENV (defaults to "sandbox"); auth
 * (client_id/secret) is injected into every request body automatically.
 */

export interface PlaidCredentials {
  clientId: string;
  secret: string;
  env: string;
}

/** Reads Plaid credentials from process.env. Returns null if not configured. */
export function getPlaidCredentials(): PlaidCredentials | null {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) return null;
  return {
    clientId,
    secret,
    env: process.env.PLAID_ENV || "sandbox",
  };
}

export function plaidBaseUrl(env: string): string {
  return `https://${env}.plaid.com`;
}

/**
 * POSTs to a Plaid endpoint, auto-injecting client_id/secret into the
 * JSON body. Throws on network failure; callers should check `ok` on
 * the returned Response for API-level errors.
 */
export async function plaidFetch(
  path: string,
  body: Record<string, unknown>,
  credentials: PlaidCredentials,
): Promise<Response> {
  const url = `${plaidBaseUrl(credentials.env)}${path}`;
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: credentials.clientId,
      secret: credentials.secret,
      ...body,
    }),
  });
}
