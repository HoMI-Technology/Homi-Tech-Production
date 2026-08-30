/**
 * T3 nav-catalog — catalog module exists and exports the SSOT names.
 * Runtime href parity stays in __tests__/layout/nav-catalog-parity.test.ts
 * (T0 KEEP). This rule is the migration seat; it does not replace that file.
 */
import { describe, expect, it } from "vitest";
import { fileFacts } from "../../support/policy/source-facts";

describe("nav-catalog-parity (AST seat)", () => {
  it("lib/layout/nav-catalog.ts exports NAV_CATALOG, HEADER_PRIMARY_NAV, HEADER_MORE_NAV", () => {
    const facts = fileFacts("lib/layout/nav-catalog.ts");
    const missing = ["NAV_CATALOG", "HEADER_PRIMARY_NAV", "HEADER_MORE_NAV"].filter(
      (n) => !facts.identifiers.has(n),
    );
    expect(
      missing,
      `nav-catalog-parity: missing exports ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
