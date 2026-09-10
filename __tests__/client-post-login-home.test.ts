import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  POST_LOGIN_HOME,
  POST_LOGIN_V4_HOME,
  resolvePostLoginDestination,
} from "@/lib/auth/postLoginDestination";

const read = (...segs: string[]) => fs.readFileSync(path.join(process.cwd(), ...segs), "utf8");

/**
 * PRODUCTION hotfix lock: client password/OAuth must not call
 * resolvePostLoginDestination(). That helper reads HOMI_V4_HOME_ENABLED,
 * which is server-only (not NEXT_PUBLIC), so the browser always saw
 * undefined and sent users to `/` after a successful password login.
 */
describe("client post-login destination (v4 Home hotfix)", () => {
  it("exposes /home as the v4 contract route", () => {
    expect(POST_LOGIN_V4_HOME).toBe("/home");
  });

  it("RCA: browser-missing HOMI_V4_HOME_ENABLED resolves to `/`, not /home", () => {
    expect(
      resolvePostLoginDestination({
        requestedNext: null,
        hasCompletedAssessment: false,
        v4HomeEnabled: false,
      }),
    ).toBe(POST_LOGIN_HOME);
    expect(POST_LOGIN_HOME).toBe("/");
    expect(POST_LOGIN_V4_HOME).not.toBe(POST_LOGIN_HOME);
  });

  it("password sign-in pushes POST_LOGIN_V4_HOME and never calls the resolver", () => {
    const page = read("app", "auth", "sign-in", "page.tsx");
    expect(page).toContain('"use client"');
    expect(page).toContain("router.push(POST_LOGIN_V4_HOME)");
    expect(page).not.toContain("resolvePostLoginDestination");
    expect(page).not.toContain("destinationAfterSignIn");
    expect(page).toContain("<OAuthButtons next={POST_LOGIN_V4_HOME} />");
  });

  it("password sign-up pushes POST_LOGIN_V4_HOME and never calls the resolver", () => {
    const page = read("app", "auth", "sign-up", "page.tsx");
    expect(page).toContain('"use client"');
    expect(page).toContain("POST_LOGIN_V4_HOME");
    expect(page).toContain("router.push(next)");
    expect(page).not.toContain("resolvePostLoginDestination");
  });

  it("OAuthButtons defaults client next to POST_LOGIN_V4_HOME", () => {
    const buttons = read("components", "auth", "OAuthButtons.tsx");
    expect(buttons).toContain('"use client"');
    expect(buttons).toContain("POST_LOGIN_V4_HOME");
    expect(buttons).not.toContain("resolvePostLoginDestination");
    expect(buttons).toContain("const destination = trimmed || POST_LOGIN_V4_HOME");
  });

  it("server magic/OAuth callback still uses the flag-aware resolver", () => {
    const callback = read("app", "auth", "callback", "route.ts");
    expect(callback).not.toContain('"use client"');
    expect(callback).toContain("resolvePostLoginDestination");
  });

  it("does not call resolvePostLoginDestination from the assessment write path", () => {
    const flow = read("components", "assessment", "FullAssessmentFlow.tsx");
    expect(flow).toContain("POST_LOGIN_V4_HOME");
    expect(flow).not.toContain("resolvePostLoginDestination");
  });

  it("server /home still folds to `/` when the v4 flag is off", () => {
    const home = read("app", "(product)", "home", "page.tsx");
    expect(home).toContain("if (!isV4HomeEnabled())");
    expect(home).toContain('redirect("/")');
  });
});
