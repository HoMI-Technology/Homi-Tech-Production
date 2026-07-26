import { describe, it, expect } from "vitest";
import {
  buildAttribution,
  readAttributionCookie,
  serializeAttributionCookie,
  ATTRIBUTION_COOKIE,
  isPartnerInviteRef,
  resolvePartnerReferralSource,
} from "@/lib/attribution";

const NOW = new Date("2026-07-16T12:00:00Z");

describe("buildAttribution", () => {
  it("returns null when nothing attributable is present", () => {
    expect(buildAttribution(new URLSearchParams("?foo=bar"), "/", NOW)).toBeNull();
  });

  it("snapshots ref + utm params with the landing path and timestamp", () => {
    const snap = buildAttribution(
      new URLSearchParams("ref=ptr_a1b2c3d4&utm_source=reddit&utm_campaign=launch"),
      "/shadow-score",
      NOW,
    );
    expect(snap).toEqual({
      ref: "ptr_a1b2c3d4",
      utm_source: "reddit",
      utm_campaign: "launch",
      landing: "/shadow-score",
      at: NOW.toISOString(),
    });
  });

  it("sanitizes hostile input: caps length and strips non-token characters", () => {
    const snap = buildAttribution(
      new URLSearchParams(`ref=${"<script>".repeat(5)}x${"a".repeat(200)}`),
      "/",
      NOW,
    );
    expect(snap?.ref).toBeDefined();
    expect(snap!.ref!.length).toBeLessThanOrEqual(100);
    expect(snap!.ref).not.toContain("<");
  });
});

describe("attribution cookie roundtrip", () => {
  it("serializes and re-reads the snapshot from a Cookie header", () => {
    const snap = buildAttribution(new URLSearchParams("ref=ptr_zz99xx11"), "/pricing", NOW)!;
    const cookie = serializeAttributionCookie(snap);
    const header = `other=1; ${cookie.split(";")[0]}; theme=dark`;
    expect(readAttributionCookie(header)).toEqual(snap);
  });

  it("rejects malformed cookie values instead of throwing", () => {
    expect(readAttributionCookie(`${ATTRIBUTION_COOKIE}=%7Bnot-json`)).toBeNull();
    expect(readAttributionCookie(`${ATTRIBUTION_COOKIE}=${encodeURIComponent('"just a string"')}`)).toBeNull();
    expect(readAttributionCookie(null)).toBeNull();
    expect(readAttributionCookie("unrelated=1")).toBeNull();
  });

  it("re-sanitizes fields on read (cookie tampering cannot inject junk into the DB)", () => {
    const raw = encodeURIComponent(
      JSON.stringify({ at: NOW.toISOString(), ref: "ok-ref", utm_source: "<img onerror=x>" }),
    );
    const snap = readAttributionCookie(`${ATTRIBUTION_COOKIE}=${raw}`);
    expect(snap?.ref).toBe("ok-ref");
    expect(snap?.utm_source ?? "").not.toContain("<");
  });
});

describe("partner invite referral denorm", () => {
  it("accepts ptr_ invite shape only", () => {
    expect(isPartnerInviteRef("ptr_a1b2c3d4")).toBe(true);
    expect(isPartnerInviteRef("PTR_A1B2C3D4")).toBe(true);
    expect(isPartnerInviteRef("reddit")).toBe(false);
    expect(isPartnerInviteRef("ptr_short")).toBe(false);
    expect(isPartnerInviteRef(undefined)).toBe(false);
  });

  it("resolves partner_user_id from code map without inventing roster links", () => {
    const map = new Map([["ptr_a1b2c3d4", "partner-uuid-1"]]);
    const snap = buildAttribution(
      new URLSearchParams("ref=ptr_a1b2c3d4"),
      "/shadow-score",
      NOW,
    );
    expect(resolvePartnerReferralSource(snap, map)).toBe("partner-uuid-1");
    expect(resolvePartnerReferralSource(snap, { "ptr_a1b2c3d4": "partner-uuid-1" })).toBe(
      "partner-uuid-1",
    );
    expect(resolvePartnerReferralSource(null, map)).toBeNull();
    expect(
      resolvePartnerReferralSource(
        buildAttribution(new URLSearchParams("utm_source=x"), "/", NOW),
        map,
      ),
    ).toBeNull();
  });
});
