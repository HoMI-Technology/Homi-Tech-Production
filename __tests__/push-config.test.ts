import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vapidConfig, isPushConfigured, vapidPublicKey } from "@/lib/push/config";

// The config helpers read process.env at call time, so mutating env between
// cases is enough — no module re-import needed.
const ENV_KEYS = [
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "NEXT_PUBLIC_SITE_URL",
];

describe("push config gating", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("reports disabled when no keys are set", () => {
    expect(vapidConfig()).toBeNull();
    expect(isPushConfigured()).toBe(false);
    expect(vapidPublicKey()).toBeNull();
  });

  it("stays disabled when only the public key is set", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    expect(vapidConfig()).toBeNull();
    expect(isPushConfigured()).toBe(false);
  });

  it("is enabled with both keys, defaulting the subject to a site mailto", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.NEXT_PUBLIC_SITE_URL = "https://homitechnology.com";
    const cfg = vapidConfig();
    expect(isPushConfigured()).toBe(true);
    expect(cfg?.publicKey).toBe("pub");
    expect(cfg?.privateKey).toBe("priv");
    expect(cfg?.subject).toBe("mailto:hello@homitechnology.com");
  });

  it("honors an explicit VAPID_SUBJECT", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:ops@example.com";
    expect(vapidConfig()?.subject).toBe("mailto:ops@example.com");
  });
});
