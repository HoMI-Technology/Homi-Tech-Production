// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CHAT_THREAD_KEY,
  CHAT_THREAD_STAMP_KEY,
  WIDGET_THREAD_KEY,
  WIDGET_THREAD_STAMP_KEY,
  clearLocalThreads,
} from "@/lib/advisor/thread-keys";
import type { AdvisorThread, ThreadMessage, ThreadSurface } from "@/lib/advisor/thread-store";

/**
 * Advisor thread store — the audit T2.6 "advisor thread" half. What matters:
 * the local thread shape is byte-identical to the pre-contract world (same
 * keys, same storage areas, same JSON message array), the server thread is
 * reconciled last-write-wins via lib/persistence.ts, server writes stay
 * external (POST /api/advisor persists each exchange — the store never PUTs
 * a whole thread), and anonymous sessions behave exactly as before.
 */

type Store = typeof import("@/lib/advisor/thread-store");

type FetchCall = { url: string; init?: RequestInit };

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const calls: FetchCall[] = [];
const responses: Response[] = [];

function queueResponse(status: number, body: unknown) {
  responses.push(jsonResponse(status, body));
}

let store: Store;

const MSG_A: ThreadMessage = { id: "a", role: "user", content: "am I ready?" };
const MSG_B: ThreadMessage = { id: "b", role: "assistant", content: "not yet." };

function storageFor(surface: ThreadSurface): Storage {
  return surface === "chat" ? window.localStorage : window.sessionStorage;
}

function threadKeyFor(surface: ThreadSurface): string {
  return surface === "chat" ? CHAT_THREAD_KEY : WIDGET_THREAD_KEY;
}

function stampKeyFor(surface: ThreadSurface): string {
  return surface === "chat" ? CHAT_THREAD_STAMP_KEY : WIDGET_THREAD_STAMP_KEY;
}

beforeEach(async () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  calls.length = 0;
  responses.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const next = responses.shift();
      if (!next) throw new Error("network down");
      return next;
    }),
  );
  vi.resetModules();
  store = await import("@/lib/advisor/thread-store");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("local-first reads and writes", () => {
  it("round-trips the chat thread through localStorage in the legacy array shape", () => {
    store.saveThreadMessages("chat", [MSG_A, MSG_B]);
    const raw = window.localStorage.getItem(CHAT_THREAD_KEY);
    expect(JSON.parse(String(raw))).toEqual([MSG_A, MSG_B]); // bare array — the pre-contract shape
    expect(store.loadThreadMessages("chat")).toEqual([MSG_A, MSG_B]);
  });

  it("round-trips the widget thread through sessionStorage — surfaces stay separate", () => {
    store.saveThreadMessages("widget", [MSG_A]);
    expect(window.sessionStorage.getItem(WIDGET_THREAD_KEY)).toBeTruthy();
    expect(window.localStorage.getItem(CHAT_THREAD_KEY)).toBeNull();
    expect(store.loadThreadMessages("chat")).toEqual([]);
    expect(store.loadThreadMessages("widget")).toEqual([MSG_A]);
  });

  it("stamps every write with ~now, and reads legacy unstamped data as 0", async () => {
    const before = Date.now();
    store.saveThreadMessages("chat", [MSG_A]);
    const stamp = Number(window.localStorage.getItem(CHAT_THREAD_STAMP_KEY));
    expect(stamp).toBeGreaterThanOrEqual(before);

    // Legacy local thread: no stamp key — the contract reads it as age 0,
    // so any provable server copy wins the reconcile.
    window.localStorage.clear();
    window.localStorage.setItem(CHAT_THREAD_KEY, JSON.stringify([MSG_A]));
    queueResponse(200, {
      conversationId: "c1",
      messages: [{ role: "user", content: "from the server" }],
      updatedAt: 1000,
    });
    const thread = await store.pullAdvisorThread("chat");
    expect(thread?.conversationId).toBe("c1");
    expect(thread?.messages[0].content).toBe("from the server");
  });
});

describe("pullAdvisorThread (LWW reconcile via /api/advisor/history)", () => {
  it("adopts a newer server thread, assigning message ids, and hydrates local storage", async () => {
    store.saveThreadMessages("chat", [MSG_A]);
    const localStamp = Number(window.localStorage.getItem(CHAT_THREAD_STAMP_KEY));
    queueResponse(200, {
      conversationId: "convo-9",
      messages: [
        { role: "user", content: "hi from my phone" },
        { role: "assistant", content: "hi — same conversation." },
      ],
      updatedAt: localStamp + 60_000,
    });

    const thread = await store.pullAdvisorThread("chat");
    expect(thread?.conversationId).toBe("convo-9");
    expect(thread?.messages.map((m) => m.content)).toEqual([
      "hi from my phone",
      "hi — same conversation.",
    ]);
    expect(thread?.messages.every((m) => typeof m.id === "string" && m.id.length > 0)).toBe(true);

    // Local hydration keeps the legacy array shape so a later anonymous
    // session renders the same thread.
    const stored = JSON.parse(
      String(window.localStorage.getItem(CHAT_THREAD_KEY)),
    ) as AdvisorThread["messages"];
    expect(stored.map((m) => m.content)).toEqual(["hi from my phone", "hi — same conversation."]);
    expect(Number(window.localStorage.getItem(CHAT_THREAD_STAMP_KEY))).toBe(localStamp + 60_000);
  });

  it("keeps a newer local thread and never PUTs — server writes stay external", async () => {
    store.saveThreadMessages("chat", [MSG_A, MSG_B]);
    queueResponse(200, {
      conversationId: "convo-9",
      messages: [{ role: "user", content: "older server message" }],
      updatedAt: 1, // far older than the local write
    });

    const thread = await store.pullAdvisorThread("chat");
    expect(thread?.messages).toEqual([MSG_A, MSG_B]);
    expect(calls).toHaveLength(1);
    expect(calls[0].init?.method ?? "GET").toBe("GET"); // the only call is the history GET
  });

  it("lets the local thread stand when the server has nothing", async () => {
    store.saveThreadMessages("chat", [MSG_A]);
    queueResponse(200, { conversationId: null, messages: [], updatedAt: null });
    const thread = await store.pullAdvisorThread("chat");
    expect(thread?.messages).toEqual([MSG_A]);
    expect(thread?.conversationId).toBeNull();
  });

  it("returns null when neither side has a thread", async () => {
    queueResponse(200, { conversationId: null, messages: [], updatedAt: null });
    expect(await store.pullAdvisorThread("chat")).toBeNull();
  });

  it("401 disables sync for the session — anonymous behaves exactly as before", async () => {
    store.saveThreadMessages("chat", [MSG_A]);
    queueResponse(401, { error: "Sign in to load your Companion history.", code: "auth_required" });
    const thread = await store.pullAdvisorThread("chat");
    expect(thread?.messages).toEqual([MSG_A]); // local thread returned as-is

    // Writes keep working locally, still in the legacy shape.
    store.saveThreadMessages("chat", [MSG_A, MSG_B]);
    expect(store.loadThreadMessages("chat")).toEqual([MSG_A, MSG_B]);
    expect(calls).toHaveLength(1); // no further server chatter
  });

  it("survives the network being down with the local thread intact", async () => {
    store.saveThreadMessages("chat", [MSG_A]);
    // nothing queued → fetch throws
    const thread = await store.pullAdvisorThread("chat");
    expect(thread?.messages).toEqual([MSG_A]);
  });

  it("reconciles the widget surface against the same server thread", async () => {
    queueResponse(200, {
      conversationId: "convo-1",
      messages: [{ role: "assistant", content: "we talked on your laptop." }],
      updatedAt: 5000,
    });
    const thread = await store.pullAdvisorThread("widget");
    expect(thread?.conversationId).toBe("convo-1");
    expect(JSON.parse(String(window.sessionStorage.getItem(WIDGET_THREAD_KEY)))).toHaveLength(1);
    expect(window.localStorage.getItem(CHAT_THREAD_KEY)).toBeNull();
  });
});

describe("clearLocalThreads", () => {
  it("clears both surfaces' threads and their stamps", () => {
    store.saveThreadMessages("chat", [MSG_A]);
    store.saveThreadMessages("widget", [MSG_B]);
    clearLocalThreads();
    expect(window.localStorage.getItem(CHAT_THREAD_KEY)).toBeNull();
    expect(window.localStorage.getItem(CHAT_THREAD_STAMP_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(WIDGET_THREAD_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(WIDGET_THREAD_STAMP_KEY)).toBeNull();
  });
});
