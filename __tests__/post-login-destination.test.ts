import { describe, expect, it } from "vitest";
import {
  POST_LOGIN_ASSESS,
  POST_LOGIN_HOME,
  resolvePostLoginDestination,
} from "@/lib/auth/postLoginDestination";

describe("resolvePostLoginDestination", () => {
  it("honors explicit deep links after sanitize", () => {
    expect(
      resolvePostLoginDestination({
        requestedNext: "/settings",
        hasCompletedAssessment: false,
      }),
    ).toBe("/settings");
    expect(
      resolvePostLoginDestination({
        requestedNext: "/path",
        hasCompletedAssessment: true,
      }),
    ).toBe("/path");
  });

  it("honors explicit Home so protected-route bounces return to /dashboard", () => {
    expect(
      resolvePostLoginDestination({
        requestedNext: "/dashboard",
        hasCompletedAssessment: false,
      }),
    ).toBe(POST_LOGIN_HOME);
  });

  it("blocks open redirects even when treating them as explicit", () => {
    expect(
      resolvePostLoginDestination({
        requestedNext: "//evil.com",
        hasCompletedAssessment: true,
      }),
    ).toBe(POST_LOGIN_HOME);
  });

  it("sends first-run accounts to Assess when next is omitted", () => {
    expect(
      resolvePostLoginDestination({
        requestedNext: null,
        hasCompletedAssessment: false,
      }),
    ).toBe(POST_LOGIN_ASSESS);
    expect(
      resolvePostLoginDestination({
        requestedNext: "",
        hasCompletedAssessment: false,
      }),
    ).toBe(POST_LOGIN_ASSESS);
  });

  it("sends scored accounts to Home when next is omitted", () => {
    expect(
      resolvePostLoginDestination({
        requestedNext: null,
        hasCompletedAssessment: true,
      }),
    ).toBe(POST_LOGIN_HOME);
  });
});
