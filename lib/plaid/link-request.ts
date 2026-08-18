/**
 * Fields we add to /link/token/create so Plaid can reach us after Link.
 *
 * webhook is always sent — it is not dashboard-allowlisted, and without it
 * TRANSACTIONS.SYNC_UPDATES_AVAILABLE never arrives.
 *
 * redirect_uri is optional. Sending a URI that is not on the Plaid
 * dashboard allowlist makes /link/token/create fail for every user, so we
 * only include it when PLAID_REDIRECT_URI is a valid https (or localhost
 * http) URL.
 */

export function plaidWebhookUrl(siteUrl: string): string {
  const origin = siteUrl.replace(/\/+$/, "");
  return `${origin}/api/plaid/webhook`;
}

export function optionalPlaidRedirectUri(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return undefined;
  }
  const localhostHttp = parsed.protocol === "http:" && parsed.hostname === "localhost";
  if (parsed.protocol !== "https:" && !localhostHttp) return undefined;
  return value;
}
