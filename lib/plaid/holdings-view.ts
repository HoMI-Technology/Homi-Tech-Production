export interface PlaidHoldingView {
  account_id: string;
  security_id: string;
  quantity: number | null;
  institution_price: number | null;
  institution_value: number | null;
  cost_basis: number | null;
  iso_currency: string | null;
  security: {
    name: string | null;
    ticker_symbol: string | null;
    type: string | null;
  } | null;
}

export interface HoldingsSummary {
  marketValue: number;
  positionCount: number;
  costBasis: number | null;
}

export function summarizePlaidHoldings(holdings: PlaidHoldingView[]): HoldingsSummary {
  let marketValue = 0;
  let cost = 0;
  let costKnown = false;
  for (const row of holdings) {
    const value = Number(row.institution_value);
    if (Number.isFinite(value)) marketValue += value;
    const basis = Number(row.cost_basis);
    if (Number.isFinite(basis)) {
      cost += basis;
      costKnown = true;
    }
  }
  return {
    marketValue,
    positionCount: holdings.length,
    costBasis: costKnown ? cost : null,
  };
}

export function holdingLabel(row: PlaidHoldingView): string {
  return row.security?.ticker_symbol || row.security?.name || row.security_id;
}
