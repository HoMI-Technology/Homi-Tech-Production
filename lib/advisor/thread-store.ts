/**
 * The advisor thread's client store, on the lib/persistence.ts contract
 * (audit T2.6 — the audit's "advisor thread" half of split-brain
 * persistence).
 *
 * Before this store, the full-page chat read/wrote raw localStorage and the
 * Companion widget raw sessionStorage, and both fetched /api/advisor/history
 * ad hoc. Now both surfaces go through one contract:
 *
 *  · Reads are LOCAL-FIRST: the UI renders the on-device thread immediately;
 *    `pullAdvisorThread()` reconciles the server thread in the background.
 *  · Writes are LOCAL-FIRST: every change persists synchronously to the
 *    surface's storage (stamped, ms epoch) so a network blip can never lose
 *    an on-screen conversation.
 *  · Server writes are EXTERNAL (the contract's `externalWrites` mode): POST
 *    /api/advisor already persists each exchange to the user's server thread
 *    (lib/advisor/memory.ts), so this store never PUTs the whole thread.
 *  · Conflicts resolve LAST-WRITE-WINS against the server thread's
 *    `updatedAt`. Signed-in chats stamp the server copy on every exchange,
 *    so cross-device threads converge on the freshest conversation.
 *  · Anonymous sessions degrade to EXACTLY the old behavior: the first 401
 *    disables sync for the session and the local copy carries on alone.
 *
 * Anonymous/offline behavior is byte-identical to the pre-contract world:
 * same keys, same storage areas (chat → localStorage, widget →
 * sessionStorage), same JSON message-array shape. The only additions are
 * sibling stamp keys, which legacy data simply lacks (stamp 0 — an
 * unstamped local thread loses to any provable server copy).
 */

import { createSyncedResource, type Stamped, type SyncedResource } from "@/lib/persistence";
import {
  CHAT_THREAD_KEY,
  CHAT_THREAD_STAMP_KEY,
  WIDGET_THREAD_KEY,
  WIDGET_THREAD_STAMP_KEY,
} from "./thread-keys";

/** Which Companion surface's local thread is meant. */
export type ThreadSurface = "chat" | "widget";

export interface ThreadMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AdvisorThread {
  /** Server conversation id — null for a local-only (anonymous) thread. */
  conversationId: string | null;
  messages: ThreadMessage[];
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function storageFor(surface: ThreadSurface): Storage | null {
  if (typeof window === "undefined") return null;
  return surface === "chat" ? window.localStorage : window.sessionStorage;
}

function keysFor(surface: ThreadSurface): { thread: string; stamp: string } {
  return surface === "chat"
    ? { thread: CHAT_THREAD_KEY, stamp: CHAT_THREAD_STAMP_KEY }
    : { thread: WIDGET_THREAD_KEY, stamp: WIDGET_THREAD_STAMP_KEY };
}

/** Normalizes a stored/parsed message; legacy entries always carry ids. */
function toMessage(raw: unknown): ThreadMessage | null {
  const m = raw as { id?: unknown; role?: unknown; content?: unknown } | null;
  if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
    return null;
  }
  return { id: typeof m.id === "string" ? m.id : makeId(), role: m.role, content: m.content };
}

/** The local thread with its LWW stamp; legacy data without a stamp reads 0. */
function loadStamped(surface: ThreadSurface): Stamped<AdvisorThread> | null {
  const storage = storageFor(surface);
  if (!storage) return null;
  try {
    const raw = storage.getItem(keysFor(surface).thread);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const messages = parsed.map(toMessage).filter((m): m is ThreadMessage => m !== null);
    const stampRaw = storage.getItem(keysFor(surface).stamp);
    const updatedAt = stampRaw ? Number.parseInt(stampRaw, 10) : 0;
    return {
      value: { conversationId: null, messages },
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Local write WITHOUT any server push (server writes are external — see the
 * module doc). Persists the legacy message-array shape exactly; the
 * conversation id is deliberately NOT stored locally — it re-hydrates from
 * /api/advisor/history on every mount, as before.
 */
function writeLocal(surface: ThreadSurface, stamped: Stamped<AdvisorThread>): void {
  const storage = storageFor(surface);
  if (!storage) return;
  try {
    storage.setItem(keysFor(surface).thread, JSON.stringify(stamped.value.messages));
    storage.setItem(keysFor(surface).stamp, String(stamped.updatedAt));
  } catch {
    // Storage may be unavailable (private browsing quota, etc). Fail silently —
    // the in-memory thread still works for the current session.
  }
}

/** Maps the /api/advisor/history GET body to the remote copy for reconcile. */
function parseHistoryRemote(body: unknown): Stamped<AdvisorThread> | null {
  const b = body as { conversationId?: unknown; messages?: unknown; updatedAt?: unknown } | null;
  if (!b || !Array.isArray(b.messages)) return null;
  const messages = b.messages.map(toMessage).filter((m): m is ThreadMessage => m !== null);
  // An empty server thread is "the server has nothing" — the local copy
  // stands (same as the pre-contract history merge).
  if (messages.length === 0) return null;
  return {
    value: {
      conversationId: typeof b.conversationId === "string" ? b.conversationId : null,
      messages,
    },
    updatedAt: typeof b.updatedAt === "number" && Number.isFinite(b.updatedAt) ? b.updatedAt : 0,
  };
}

const resources = new Map<ThreadSurface, SyncedResource<AdvisorThread>>();

function resourceFor(surface: ThreadSurface): SyncedResource<AdvisorThread> {
  let resource = resources.get(surface);
  if (!resource) {
    resource = createSyncedResource<AdvisorThread>({
      endpoint: "/api/advisor/history",
      loadLocal: () => loadStamped(surface),
      saveLocal: (stamped) => writeLocal(surface, stamped),
      parseRemote: parseHistoryRemote,
      // The server thread is appended to by POST /api/advisor itself — this
      // resource pulls and reconciles but never pushes a whole thread.
      externalWrites: true,
    });
    resources.set(surface, resource);
  }
  return resource;
}

/** Local-first read: the on-device thread, or [] when none. SSR-safe. */
export function loadThreadMessages(surface: ThreadSurface): ThreadMessage[] {
  return loadStamped(surface)?.value.messages ?? [];
}

/**
 * Local-first write: persists the thread synchronously (stamped now). The
 * server copy updates through the POST /api/advisor flow, not here.
 */
export function saveThreadMessages(surface: ThreadSurface, messages: ThreadMessage[]): void {
  writeLocal(surface, { value: { conversationId: null, messages }, updatedAt: Date.now() });
}

/**
 * Reconcile with the server thread (last-write-wins) and return the freshest
 * copy — with the server conversation id when the server won. The winner is
 * persisted locally. Anonymous and offline sessions reconcile to the local
 * copy (null only when nothing is stored anywhere), so the local thread
 * stands either way. Call once on mount, BEFORE the user could have sent a
 * message from a stale copy.
 */
export async function pullAdvisorThread(surface: ThreadSurface): Promise<AdvisorThread | null> {
  const winner = await resourceFor(surface).pull();
  return winner?.value ?? null;
}
