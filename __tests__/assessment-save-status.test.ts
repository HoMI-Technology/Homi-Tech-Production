// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SAVE_STATUS_KEY,
  clearSaveStatus,
  loadSaveStatus,
  recordSaveStatus,
  statusFromResponse,
  subscribeSaveStatus,
} from "@/lib/assessment/save-status";

/**
 * Save-status channel between the assessment flows (fire-and-forget POST) and
 * /results (Plans.md F.12). The flows record how the background save resolved;
 * the results surface subscribes so a signed-in user finally learns when their
 * result was NOT persisted (402 rescoring_locked, 400/500, network failure) —
 * previously all swallowed.
 */

describe("assessment save status", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    clearSaveStatus();
  });

  it("maps response statuses to outcomes", () => {
    expect(statusFromResponse(200)).toBe("saved");
    expect(statusFromResponse(401)).toBe("unauthenticated");
    expect(statusFromResponse(402)).toBe("locked");
    expect(statusFromResponse(400)).toBe("failed");
    expect(statusFromResponse(500)).toBe("failed");
  });

  it("round-trips a recorded outcome with a timestamp", () => {
    recordSaveStatus("locked");
    const loaded = loadSaveStatus();
    expect(loaded?.outcome).toBe("locked");
    expect(loaded?.at).toBeTruthy();
  });

  it("clears the recorded outcome", () => {
    recordSaveStatus("failed");
    clearSaveStatus();
    expect(loadSaveStatus()).toBeNull();
    expect(window.localStorage.getItem(SAVE_STATUS_KEY)).toBeNull();
  });

  it("notifies subscribers on record and stops after unsubscribe", () => {
    const seen: string[] = [];
    const unsubscribe = subscribeSaveStatus((status) => {
      seen.push(status?.outcome ?? "null");
    });
    recordSaveStatus("pending");
    recordSaveStatus("saved");
    unsubscribe();
    recordSaveStatus("failed");
    expect(seen).toEqual(["pending", "saved"]);
  });

  it("returns null for a malformed stored payload", () => {
    window.localStorage.setItem(SAVE_STATUS_KEY, "{not json");
    expect(loadSaveStatus()).toBeNull();
    window.localStorage.setItem(SAVE_STATUS_KEY, JSON.stringify({ outcome: "banana" }));
    expect(loadSaveStatus()).toBeNull();
  });

  it("is a no-op without window (SSR)", () => {
    const w = globalThis.window;
    // @ts-expect-error simulating server environment
    delete globalThis.window;
    expect(() => recordSaveStatus("saved")).not.toThrow();
    expect(loadSaveStatus()).toBeNull();
    globalThis.window = w;
  });
});
