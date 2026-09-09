import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/auth/safeNext";

describe("safeNext (open-redirect guard)", () => {
  it("passes plain in-app paths through unchanged", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard");
    expect(safeNext("/report/123?tab=x")).toBe("/report/123?tab=x");
    expect(safeNext("/tools/heloc")).toBe("/tools/heloc");
    expect(safeNext("/")).toBe("/");
  });

  it("falls back for empty/missing input", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext("")).toBe("/");
    expect(safeNext(null, "/onboarding")).toBe("/onboarding");
  });

  it("blocks protocol-relative off-site redirects", () => {
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("//evil.com/path")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
  });

  it("blocks absolute URLs and scheme injection", () => {
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("http://evil.com")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
    expect(safeNext("/redirect?to=https://evil.com")).toBe("/redirect?to=https://evil.com"); // in-app path with a query is fine
  });

  it("blocks encoded slash tricks and control chars", () => {
    expect(safeNext("/%2fevil.com")).toBe("/");
    expect(safeNext("/%5cevil.com")).toBe("/");
    expect(safeNext("/\x00/evil")).toBe("/");
  });

  it("rejects anything not starting with a single slash", () => {
    expect(safeNext("dashboard")).toBe("/");
    expect(safeNext("../../etc")).toBe("/");
  });
});
