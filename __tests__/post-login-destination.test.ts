import { describe, expect, it } from "vitest";
import {
  POST_LOGIN_ASSESS,
  POST_LOGIN_HOME,
  POST_LOGIN_V4_HOME,
  clientPostLoginDestination,
  resolvePostLoginDestination,
} from "@/lib/auth/postLoginDestination";

describe("resolvePostLoginDestination (PR15 + CCP v1)", () => {
  it("flag false (default) keeps `/`, ignoring next and assessment state", () => {
    expect(POST_LOGIN_HOME).toBe("/");
    expect(POST_LOGIN_ASSESS).toBe("/");
    expect(POST_LOGIN_V4_HOME).toBe("/home");
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
        v4HomeEnabled: false,
      }),
    ).toBe("/");
    expect(
      resolvePostLoginDestination({
        requestedNext: "/home",
        hasCompletedAssessment: true,
        v4HomeEnabled: false,
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

  it("flag true lands on `/home` only when the V4 allow-list includes Home", () => {
    expect(
      resolvePostLoginDestination({
        requestedNext: "/dashboard",
        hasCompletedAssessment: true,
        v4HomeEnabled: true,
      }),
    ).toBe("/home");
    expect(
      resolvePostLoginDestination({
        requestedNext: null,
        hasCompletedAssessment: false,
        v4HomeEnabled: true,
        v4AllowList: ["/home"],
      }),
    ).toBe("/home");
    expect(
      resolvePostLoginDestination({
        requestedNext: null,
        hasCompletedAssessment: false,
        v4HomeEnabled: true,
        v4AllowList: [],
      }),
    ).toBe("/");
    expect(
      resolvePostLoginDestination({
        requestedNext: null,
        hasCompletedAssessment: false,
        v4HomeEnabled: true,
        v4AllowList: ["/shell"],
      }),
    ).toBe("/");
  });
});

describe("clientPostLoginDestination (password sign-in)", () => {
  it("sends /home without reading HOMI_V4_HOME_ENABLED, even when the server resolver would stay on /", () => {
    expect(
      resolvePostLoginDestination({
        requestedNext: null,
        hasCompletedAssessment: false,
      }),
    ).toBe("/");
    expect(clientPostLoginDestination(null)).toBe("/home");
    expect(clientPostLoginDestination("/dashboard")).toBe("/home");
    expect(clientPostLoginDestination("//evil.com")).toBe("/home");
  });

  it("still honors the reset-password KEEP next", () => {
    expect(clientPostLoginDestination("/auth/reset-password")).toBe("/auth/reset-password");
    expect(clientPostLoginDestination("/auth/reset-password?token=abc")).toBe(
      "/auth/reset-password?token=abc",
    );
  });
});
