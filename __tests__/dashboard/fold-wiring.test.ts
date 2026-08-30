/**
 * Home chrome catalog: Money is More, not a peer home; Assess stays primary.
 * Fold source-locks live in T3 policy.
 */
import { describe, expect, it } from "vitest";
import {
  PRIMARY_CLOSE_LABEL,
  SIGNED_IN_ASSESS_HREF,
} from "@/components/marketing/first-moment-copy";
import { HEADER_MORE_NAV, HEADER_PRIMARY_NAV } from "@/lib/layout/nav-catalog";

describe("signed-in Assess close", () => {
  it("empty-home close is Assess → /assessment", () => {
    expect(SIGNED_IN_ASSESS_HREF).toBe("/assessment");
    expect(PRIMARY_CLOSE_LABEL).toBe("Assess");
  });
});

describe("header catalog — Money is depth, not a peer home", () => {
  it("Money is not in HEADER_PRIMARY_NAV", () => {
    expect(HEADER_PRIMARY_NAV.map((i) => i.href)).not.toContain("/money");
    expect(HEADER_PRIMARY_NAV.map((i) => i.href)).toContain("/assessment");
    expect(HEADER_MORE_NAV.map((i) => i.href)).toContain("/money");
    expect(HEADER_PRIMARY_NAV.map((i) => i.href)).not.toContain("/advisor");
    expect(HEADER_MORE_NAV.map((i) => i.href)).not.toContain("/advisor");
  });
});
