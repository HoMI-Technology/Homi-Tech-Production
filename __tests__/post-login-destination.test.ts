import { describe, expect, it } from "vitest";
import {
  POST_LOGIN_ASSESS,
  POST_LOGIN_HOME,
  resolvePostLoginDestination,
} from "@/lib/auth/postLoginDestination";

describe("resolvePostLoginDestination (PR15)", () => {
  it("always returns `/`, ignoring next and assessment state", () => {
    expect(POST_LOGIN_HOME).toBe("/");
    expect(POST_LOGIN_ASSESS).toBe("/");
    expect(
      resolvePostLoginDestination({
        requestedNext: "/settings",
        hasCompletedAssessment: false,
      }),
    ).toBe("/");
    expect(
      resolvePostLoginDestination({
        requestedNext: "/dashboard",
        hasCompletedAssessment: true,
      }),
    ).toBe("/");
    expect(
      resolvePostLoginDestination({
        requestedNext: "/path",
        hasCompletedAssessment: true,
      }),
    ).toBe("/");
    expect(
      resolvePostLoginDestination({
        requestedNext: null,
        hasCompletedAssessment: false,
      }),
    ).toBe("/");
    expect(
      resolvePostLoginDestination({
        requestedNext: "/auth/reset-password",
        hasCompletedAssessment: false,
      }),
    ).toBe("/auth/reset-password");
    expect(
      resolvePostLoginDestination({
        requestedNext: "//evil.com",
        hasCompletedAssessment: true,
      }),
    ).toBe("/");
  });
});
