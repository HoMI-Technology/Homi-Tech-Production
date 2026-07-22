import { describe, expect, it } from "vitest";
import { signInNextParam } from "@/lib/auth/signInRedirect";

describe("signInNextParam", () => {
  it("keeps default-locale paths unprefixed", () => {
    expect(signInNextParam("/team", "en")).toBe("/team");
    expect(signInNextParam("/partner/dashboard", "en")).toBe("/partner/dashboard");
  });

  it("prefixes Spanish next targets the same way middleware does", () => {
    expect(signInNextParam("/team", "es")).toBe("/es/team");
    expect(signInNextParam("/analytics", "es")).toBe("/es/analytics");
  });

  it("does not double-prefix an already localized next path", () => {
    expect(signInNextParam("/es/team", "es")).toBe("/es/team");
  });

  it("normalizes missing leading slashes", () => {
    expect(signInNextParam("team", "en")).toBe("/team");
    expect(signInNextParam("team", "es")).toBe("/es/team");
  });
});
