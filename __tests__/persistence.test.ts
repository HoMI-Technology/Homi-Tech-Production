// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSyncedResource, reconcile, type Stamped } from "@/lib/persistence";

describe("reconcile (LWW)", () => {
  const local: Stamped<string> = { value: "local", updatedAt: 200 };
  const remote: Stamped<string> = { value: "remote", updatedAt: 100 };

  it("returns none when neither side has data", () => {
    expect(reconcile(null, null)).toEqual({ winner: "none", value: null, shouldPushLocal: false });
  });

  it("local-only wins and seeds the server", () => {
    expect(reconcile(local, null)).toEqual({
      winner: "local",
      value: "local",
      shouldPushLocal: true,
    });
  });

  it("remote-only wins without a push", () => {
    expect(reconcile(null, remote)).toEqual({
      winner: "remote",
      value: "remote",
      shouldPushLocal: false,
    });
  });

  it("newer local wins and pushes", () => {
    expect(reconcile(local, remote).winner).toBe("local");
    expect(reconcile(local, remote).shouldPushLocal).toBe(true);
  });

  it("newer remote wins", () => {
    expect(reconcile({ ...local, updatedAt: 50 }, remote).winner).toBe("remote");
  });

  it("ties and legacy unstamped local (0) go to remote — provable recency wins", () => {
    expect(reconcile({ ...local, updatedAt: 100 }, remote).winner).toBe("remote");
    expect(reconcile({ ...local, updatedAt: 0 }, remote).winner).toBe("remote");
  });
});

// ── createSyncedResource ─────────────────────────────────────────────

type FetchCall = { url: string; init?: RequestInit };

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function makeHarness(
  initialLocal: Stamped<number> | null = null,
  extra: Partial<Parameters<typeof createSyncedResource<number>>[0]> = {},
) {
  let local = initialLocal;
  const calls: FetchCall[] = [];
  const responses: Response[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const next = responses.shift();
      if (!next) throw new Error("network down");
      return next;
    }),
  );
  const resource = createSyncedResource<number>({
    endpoint: "/api/test",
    loadLocal: () => local,
    saveLocal: (s) => {
      local = s;
    },
    debounceMs: 100,
    ...extra,
  });
  return { resource, calls, responses, getLocal: () => local };
}

describe("createSyncedResource", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("pull adopts a newer remote copy into local", async () => {
    const h = makeHarness({ value: 1, updatedAt: 100 });
    h.responses.push(jsonResponse(200, { state: 2, client_updated_at: 500 }));
    const result = await h.resource.pull();
    expect(result).toEqual({ value: 2, updatedAt: 500 });
    expect(h.getLocal()).toEqual({ value: 2, updatedAt: 500 });
  });

  it("pull keeps a newer local copy and pushes it", async () => {
    const h = makeHarness({ value: 7, updatedAt: 900 });
    h.responses.push(jsonResponse(200, { state: 2, client_updated_at: 500 })); // GET
    h.responses.push(jsonResponse(200, { ok: true })); // queued PUT
    const result = await h.resource.pull();
    expect(result).toEqual({ value: 7, updatedAt: 900 });
    await vi.advanceTimersByTimeAsync(150);
    expect(h.calls).toHaveLength(2);
    const put = h.calls[1];
    expect(put.init?.method).toBe("PUT");
    expect(JSON.parse(String(put.init?.body))).toEqual({ state: 7, client_updated_at: 900 });
  });

  it("pull survives the network being down by returning local", async () => {
    const h = makeHarness({ value: 3, updatedAt: 100 });
    // no responses queued → fetch throws
    const result = await h.resource.pull();
    expect(result).toEqual({ value: 3, updatedAt: 100 });
  });

  it("401 disables sync for the session — anonymous stays local-only", async () => {
    const h = makeHarness({ value: 3, updatedAt: 100 });
    h.responses.push(jsonResponse(401, { error: "Not authenticated." }));
    await h.resource.pull();
    expect(h.resource.isDisabled()).toBe(true);
    h.resource.push({ value: 4, updatedAt: 200 });
    await vi.advanceTimersByTimeAsync(500);
    expect(h.calls).toHaveLength(1); // only the original GET — no PUT attempted
  });

  it("debounces rapid pushes into one PUT carrying the last value", async () => {
    const h = makeHarness();
    h.responses.push(jsonResponse(200, { ok: true }));
    h.resource.push({ value: 1, updatedAt: 100 });
    h.resource.push({ value: 2, updatedAt: 200 });
    h.resource.push({ value: 3, updatedAt: 300 });
    await vi.advanceTimersByTimeAsync(250);
    expect(h.calls).toHaveLength(1);
    expect(JSON.parse(String(h.calls[0].init?.body))).toEqual({ state: 3, client_updated_at: 300 });
  });

  it("adopts the server copy when a PUT is answered stale", async () => {
    const h = makeHarness({ value: 1, updatedAt: 100 });
    h.responses.push(jsonResponse(200, { stale: true, state: 9, client_updated_at: 999 }));
    h.resource.push({ value: 1, updatedAt: 100 });
    await vi.advanceTimersByTimeAsync(250);
    expect(h.getLocal()).toEqual({ value: 9, updatedAt: 999 });
  });

  it("honors a custom parseRemote adapter for non-contract GET shapes", async () => {
    const h = makeHarness(null, {
      parseRemote: (body) => {
        const b = body as { items?: number; stamp?: number } | null;
        return typeof b?.items === "number" && typeof b?.stamp === "number"
          ? { value: b.items, updatedAt: b.stamp }
          : null;
      },
    });
    h.responses.push(jsonResponse(200, { items: 42, stamp: 700 }));
    const result = await h.resource.pull();
    expect(result).toEqual({ value: 42, updatedAt: 700 });
    expect(h.getLocal()).toEqual({ value: 42, updatedAt: 700 });
  });

  it("externalWrites never PUTs — not after local wins, not on push()", async () => {
    const h = makeHarness({ value: 5, updatedAt: 900 }, { externalWrites: true });
    h.responses.push(jsonResponse(200, { state: 1, client_updated_at: 100 })); // GET — local wins
    const result = await h.resource.pull();
    expect(result).toEqual({ value: 5, updatedAt: 900 });
    h.resource.push({ value: 6, updatedAt: 1000 });
    await h.resource.flush();
    await vi.advanceTimersByTimeAsync(500);
    expect(h.calls).toHaveLength(1); // the GET only — server writes stay external
    expect(h.getLocal()).toEqual({ value: 5, updatedAt: 900 });
  });
});
