import { plaidFetch, type PlaidCredentials } from "@/lib/plaid/client";

/**
 * Points an existing Item at our receiver. The webhook URL is not a
 * dashboard setting — Plaid only stores what we send on /link/token/create
 * or /item/webhook/update. New Links already pass `webhook`; this covers
 * Items created before that field was set.
 */
export async function registerItemWebhook(
  accessToken: string,
  credentials: PlaidCredentials,
  webhookUrl: string,
): Promise<boolean> {
  const res = await plaidFetch(
    "/item/webhook/update",
    { access_token: accessToken, webhook: webhookUrl },
    credentials,
  );
  return res.ok;
}
