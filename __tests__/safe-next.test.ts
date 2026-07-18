import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/auth/safeNext";

describe("safeNext (open-redirect guard)", () => {
  it("passes plain in-app paths through unchanged", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard");
    expect(safeNext("/report/123?tab=x")).toBe("/report/123?tab=x");
    expect(safeNext("/tools/heloc")).toBe("/tools/heloc");
  });

  it("falls back for empty/missing input", () => {
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext(undefined)).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
    expect(safeNext(null, "/onboarding")).toBe("/onboarding");
  });

  it("blocks protocol-relative off-site redirects", () => {
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("//evil.com/path")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
  });

  it("blocks absolute URLs and scheme injection", () => {
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("http://evil.com")).toBe("/dashboard");
    expect(safeNext("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNext("/redirect?to=https://evil.com")).toBe("/redirect?to=https://evil.com"); // in-app path with a query is fine
  });

  it("blocks encoded slash tricks and control chars", () => {
    expect(safeNext("/%2fevil.com")).toBe("/dashboard");
    expect(safeNext("/%5cevil.com")).toBe("/dashboard");
    expect(safeNext("/\x00/evil")).toBe("/dashboard");
  });

  it("rejects anything not starting with a single slash", () => {
    expect(safeNext("dashboard")).toBe("/dashboard");
    expect(safeNext("../../etc")).toBe("/dashboard");
  });
});
