/**
 * Investments mappers. Holdings are a replace-snapshot. Investment
 * transactions are a separate table from plaid_transactions — Plaid's
 * investment amount sign is inverted vs /transactions/sync, and there is
 * no /investments/transactions/sync.
 */

export interface PlaidSecurityInput {
  security_id: string;
  name?: string | null;
  ticker_symbol?: string | null;
  type?: string | null;
  subtype?: string | null;
  figi?: string | null;
  is_cash_equivalent?: boolean | null;
  close_price?: number | null;
  institution_security_id?: string | null;
  institution_id?: string | null;
  cusip?: string | null;
  isin?: string | null;
}

export interface PlaidHoldingInput {
  account_id: string;
  security_id: string;
  quantity?: number | null;
  institution_price?: number | null;
  institution_value?: number | null;
  cost_basis?: number | null;
  iso_currency_code?: string | null;
  unofficial_currency_code?: string | null;
  vested_quantity?: number | null;
  vested_value?: number | null;
}

export interface PlaidInvestmentTxnInput {
  investment_transaction_id: string;
  account_id?: string | null;
  security_id?: string | null;
  date?: string | null;
  name?: string | null;
  amount?: number | null;
  quantity?: number | null;
  price?: number | null;
  fees?: number | null;
  type?: string | null;
  subtype?: string | null;
  iso_currency_code?: string | null;
  cancel_transaction_id?: string | null;
}

export function mapSecurityRow(security: PlaidSecurityInput): Record<string, unknown> {
  return {
    security_id: security.security_id,
    name: security.name ?? null,
    ticker_symbol: security.ticker_symbol ?? null,
    type: security.type ?? null,
    subtype: security.subtype ?? null,
    figi: security.figi ?? null,
    is_cash_equivalent: security.is_cash_equivalent ?? false,
    close_price: security.close_price ?? null,
    institution_security_id: security.institution_security_id ?? null,
    institution_id: security.institution_id ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function mapHoldingRow(
  item: { id: string; user_id: string },
  holding: PlaidHoldingInput,
): Record<string, unknown> {
  return {
    item_id: item.id,
    user_id: item.user_id,
    account_id: holding.account_id,
    security_id: holding.security_id,
    quantity: holding.quantity ?? null,
    institution_price: holding.institution_price ?? null,
    institution_value: holding.institution_value ?? null,
    cost_basis: holding.cost_basis ?? null,
    iso_currency: holding.iso_currency_code ?? holding.unofficial_currency_code ?? null,
    vested_quantity: holding.vested_quantity ?? null,
    vested_value: holding.vested_value ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function mapInvestmentTransactionRow(
  item: { id: string; user_id: string },
  txn: PlaidInvestmentTxnInput,
): Record<string, unknown> {
  return {
    item_id: item.id,
    user_id: item.user_id,
    account_id: txn.account_id ?? null,
    security_id: txn.security_id ?? null,
    investment_transaction_id: txn.investment_transaction_id,
    txn_date: txn.date ?? null,
    name: txn.name ?? null,
    amount: txn.amount ?? null,
    quantity: txn.quantity ?? null,
    price: txn.price ?? null,
    fees: txn.fees ?? null,
    type: txn.type ?? null,
    subtype: txn.subtype ?? null,
    iso_currency: txn.iso_currency_code ?? null,
    cancel_transaction_id: txn.cancel_transaction_id ?? null,
    updated_at: new Date().toISOString(),
  };
}
