import { describe, it, expect } from "vitest";
import {
  accountNeedsInvestments,
  accountNeedsLiabilities,
  newItemLinkProducts,
  updateModeLinkProducts,
} from "@/lib/plaid/products";

describe("newItemLinkProducts", () => {
  it("keeps Transactions as the only required product so Link is not intersection-filtered", () => {
    const body = newItemLinkProducts();
    expect(body.products).toEqual(["transactions"]);
    expect(body.required_if_supported_products).toEqual(["identity"]);
    expect(body.additional_consented_products).toEqual(["investments", "liabilities"]);
    const all = [
      ...body.products,
      ...body.required_if_supported_products,
      ...body.additional_consented_products,
    ];
    expect(new Set(all).size).toBe(all.length);
    expect(all).not.toContain("auth");
    expect(all).not.toContain("identity_verification");
  });
});

describe("updateModeLinkProducts", () => {
  it("consents the extra products without a products array (update mode)", () => {
    const body = updateModeLinkProducts();
    expect(body.products).toBeUndefined();
    expect(body.additional_consented_products).toEqual([
      "investments",
      "identity",
      "liabilities",
    ]);
  });
});

describe("account product gates", () => {
  it("requests investments only for investment/brokerage accounts", () => {
    expect(accountNeedsInvestments("investment")).toBe(true);
    expect(accountNeedsInvestments("brokerage")).toBe(true);
    expect(accountNeedsInvestments("depository")).toBe(false);
    expect(accountNeedsInvestments("credit")).toBe(false);
  });

  it("requests liabilities only for credit cards, student loans, and mortgages", () => {
    expect(accountNeedsLiabilities("credit", "credit card")).toBe(true);
    expect(accountNeedsLiabilities("loan", "student")).toBe(true);
    expect(accountNeedsLiabilities("loan", "mortgage")).toBe(true);
    expect(accountNeedsLiabilities("loan", "auto")).toBe(false);
    expect(accountNeedsLiabilities("depository", "checking")).toBe(false);
    expect(accountNeedsLiabilities("investment", "401k")).toBe(false);
  });
});
