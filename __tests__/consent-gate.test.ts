// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CONSENT_KEY,
  readConsent,
  writeConsent,
  onConsentChange,
} from "@/components/consent/consent-shared";

/**
 * The consent value is a GATE on optional analytics, not a banner-dismissal
 * flag. These lock in the two properties that matter:
 *   · silence is not consent (unset and unreadable both read as "not granted")
 *   · a recorded rejection is durable and observable
 */

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-homi-consent");
});

describe("readConsent", () => {
  it("returns unset when nothing has been decided", () => {
    expect(readConsent()).toBe("unset");
  });

  it("reads the historical '1' marker as granted (backward compatible)", () => {
    window.localStorage.setItem(CONSENT_KEY, "1");
    expect(readConsent()).toBe("granted");
  });

  it("reads '0' as denied", () => {
    window.localStorage.setItem(CONSENT_KEY, "0");
    expect(readConsent()).toBe("denied");
  });

  it("treats an unrecognized value as unset rather than granted", () => {
    window.localStorage.setItem(CONSENT_KEY, "yes-please");
    expect(readConsent()).toBe("unset");
  });

  it("fails closed to unset when storage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    expect(readConsent()).toBe("unset");
    spy.mockRestore();
  });
});

describe("writeConsent", () => {
  it("persists a grant and reads back as granted", () => {
    writeConsent("granted");
    expect(readConsent()).toBe("granted");
  });

  it("persists a rejection and reads back as denied", () => {
    writeConsent("denied");
    expect(readConsent()).toBe("denied");
  });

  it("supports withdrawal — granted then denied ends denied", () => {
    writeConsent("granted");
    expect(readConsent()).toBe("granted");
    writeConsent("denied");
    expect(readConsent()).toBe("denied");
  });

  it("marks the document as decided for both answers", () => {
    writeConsent("denied");
    expect(document.documentElement.getAttribute("data-homi-consent")).toBe("1");
  });

  it("does not throw when storage is unavailable", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    expect(() => writeConsent("granted")).not.toThrow();
    spy.mockRestore();
  });
});

describe("onConsentChange", () => {
  it("notifies listeners when the choice changes", () => {
    const seen: string[] = [];
    const off = onConsentChange((s) => seen.push(s));
    writeConsent("granted");
    writeConsent("denied");
    off();
    expect(seen).toEqual(["granted", "denied"]);
  });

  it("stops notifying after unsubscribe", () => {
    const seen: string[] = [];
    const off = onConsentChange((s) => seen.push(s));
    off();
    writeConsent("granted");
    expect(seen).toEqual([]);
  });
});

describe("track() forwarding gate", () => {
  beforeEach(() => {
    vi.resetModules();
    delete (window as { posthog?: unknown }).posthog;
    delete (window as { __homiEvents?: unknown }).__homiEvents;
  });

  it("does not forward to PostHog before a decision", async () => {
    const capture = vi.fn();
    (window as { posthog?: unknown }).posthog = { capture };
    const { track } = await import("@/lib/analytics");
    track("page_viewed", { section: "home" });
    expect(capture).not.toHaveBeenCalled();
  });

  it("does not forward to PostHog after rejection", async () => {
    const capture = vi.fn();
    (window as { posthog?: unknown }).posthog = { capture };
    writeConsent("denied");
    const { track } = await import("@/lib/analytics");
    track("page_viewed");
    expect(capture).not.toHaveBeenCalled();
  });

  it("forwards once consent is granted", async () => {
    const capture = vi.fn();
    (window as { posthog?: unknown }).posthog = { capture };
    writeConsent("granted");
    const { track } = await import("@/lib/analytics");
    track("page_viewed", { section: "home" });
    expect(capture).toHaveBeenCalledWith("page_viewed", { section: "home" });
  });

  it("still records to the in-tab buffer regardless of consent", async () => {
    const { track } = await import("@/lib/analytics");
    track("page_viewed");
    // Never leaves the device and carries no identifier, so it is not gated.
    expect(window.__homiEvents?.map((e) => e.event)).toContain("page_viewed");
  });
});
