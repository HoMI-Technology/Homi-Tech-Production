/**
 * Link product arrays for the full financial picture.
 *
 * Official PFM pattern (plaid.com/docs/link/initializing-products):
 * Transactions is the sole required product so Link is not filtered to the
 * intersection of every product. Identity is required-if-supported so OAuth
 * banks cannot silently drop it. Investments and Liabilities are consented
 * now and billed only when we call their endpoints for matching accounts.
 */

export function newItemLinkProducts(): {
  products: string[];
  required_if_supported_products: string[];
  additional_consented_products: string[];
} {
  return {
    products: ["transactions"],
    required_if_supported_products: ["identity"],
    additional_consented_products: ["investments", "liabilities"],
  };
}

export function updateModeLinkProducts(): {
  additional_consented_products: string[];
} {
  return {
    additional_consented_products: ["investments", "identity", "liabilities"],
  };
}

export function accountNeedsInvestments(type: string | null | undefined): boolean {
  return type === "investment" || type === "brokerage";
}

export function accountNeedsLiabilities(
  type: string | null | undefined,
  subtype: string | null | undefined,
): boolean {
  if (type === "credit") return true;
  if (type === "loan" && (subtype === "student" || subtype === "mortgage")) return true;
  return false;
}

export function anyAccountNeedsInvestments(
  accounts: Array<{ type?: string | null }>,
): boolean {
  return accounts.some((account) => accountNeedsInvestments(account.type));
}

export function anyAccountNeedsLiabilities(
  accounts: Array<{ type?: string | null; subtype?: string | null }>,
): boolean {
  return accounts.some((account) => accountNeedsLiabilities(account.type, account.subtype));
}
