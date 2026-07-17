/**
 * Persistence contract (audit T2.6) — local-first, background-synced.
 *
 * The split-brain problem: some features persist to localStorage, some to the
 * database, and users can't form a model of what survives. This module is the
 * one contract both sides share, applied feature-by-feature (finance first):
 *
 *  · Reads are LOCAL-FIRST: the UI renders from localStorage immediately;
 *    `pull()` then reconciles against the server copy in the background.
 *  · Writes are LOCAL-FIRST: localStorage synchronously (never lose an edit
 *    to a network blip), then a debounced background `push()` to the server.
 *  · Conflicts resolve LAST-WRITE-WINS by the writing client's clock — these
 *    are single-author resources (a user's own numbers), where LWW is honest
 *    and anything fancier is ceremony.
 *  · Anonymous sessions degrade to exactly the old behavior: the first 401
 *    disables sync for the session and localStorage carries on alone.
 *
 * Endpoints implementing the server side speak one shape:
 *    GET  → { state: T | null, client_updated_at?: number }
 *    PUT  { state: T, client_updated_at: number }
 *         → { ok: true } | { stale: true, state: T, client_updated_at: number }
 *    (401 when signed out; PUT answers `stale` when the server copy is newer
 *     instead of accepting the write.)
 */

export interface Stamped<T> {
  value: T;
  /** ms epoch from the writing client; 0 = legacy data of unknown age. */
  updatedAt: number;
}

export interface ReconcileResult<T> {
  winner: "local" | "remote" | "none";
  value: T | null;
  /** True when the local copy should be pushed (server empty or older). */
  shouldPushLocal: boolean;
}

/**
 * Pure LWW reconciliation. Ties — and legacy local data stamped 0 — go to the
 * remote copy: the server timestamp is provable, an unstamped local copy is of
 * unknown age, and adopting a forgotten device's stale numbers over a user's
 * active cross-device state is the worse failure.
 */
export function reconcile<T>(
  local: Stamped<T> | null,
  remote: Stamped<T> | null,
): ReconcileResult<T> {
  if (!local && !remote) return { winner: "none", value: null, shouldPushLocal: false };
  if (local && !remote) return { winner: "local", value: local.value, shouldPushLocal: true };
  if (!local && remote) return { winner: "remote", value: remote.value, shouldPushLocal: false };
  if ((local as Stamped<T>).updatedAt > (remote as Stamped<T>).updatedAt) {
    return { winner: "local", value: (local as Stamped<T>).value, shouldPushLocal: true };
  }
  return { winner: "remote", value: (remote as Stamped<T>).value, shouldPushLocal: false };
}

export interface SyncedResourceConfig<T> {
  /** API route implementing the GET/PUT shape above. */
  endpoint: string;
  /** Read the local copy (null when nothing stored). */
  loadLocal: () => Stamped<T> | null;
  /** Write the local copy. MUST NOT trigger push — the sync layer calls this. */
  saveLocal: (stamped: Stamped<T>) => void;
  /** Push debounce; edits within the window collapse to one request. */
  debounceMs?: number;
}

export interface SyncedResource<T> {
  /**
   * Fetch the server copy, reconcile with local, persist the winner locally,
   * and return it (null when neither side has data or the network failed —
   * the caller falls back to local/defaults either way).
   */
  pull: () => Promise<Stamped<T> | null>;
  /** Queue a background write of the given stamped value. */
  push: (stamped: Stamped<T>) => void;
  /** Send any queued write now (also armed on tab-hide automatically). */
  flush: () => Promise<void>;
  /** True once a 401 marked this session anonymous. */
  isDisabled: () => boolean;
}

export function createSyncedResource<T>(config: SyncedResourceConfig<T>): SyncedResource<T> {
  const debounceMs = config.debounceMs ?? 1500;
  let disabled = false;
  let timer: number | undefined;
  let pending: Stamped<T> | null = null;
  let listenersArmed = false;

  async function flush(): Promise<void> {
    if (typeof window !== "undefined" && timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    const toSend = pending;
    pending = null;
    if (!toSend || disabled) return;
    try {
      const res = await fetch(config.endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: toSend.value, client_updated_at: toSend.updatedAt }),
        // Survives tab close for the pagehide flush.
        keepalive: true,
      });
      if (res.status === 401) {
        disabled = true;
        return;
      }
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { stale?: boolean; state?: T; client_updated_at?: number }
          | null;
        // A newer copy exists remotely (another device won the race) — adopt
        // it locally so the next read tells the truth.
        if (body?.stale && body.state != null && typeof body.client_updated_at === "number") {
          config.saveLocal({ value: body.state, updatedAt: body.client_updated_at });
        }
      }
      // Non-OK (5xx, table not migrated): keep local, retry on the next edit.
    } catch {
      // Offline — local copy is intact; the next edit retries.
    }
  }

  function armFlushListeners(): void {
    if (listenersArmed || typeof window === "undefined") return;
    listenersArmed = true;
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", () => void flush());
  }

  function push(stamped: Stamped<T>): void {
    if (typeof window === "undefined" || disabled) return;
    pending = stamped;
    armFlushListeners();
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(() => void flush(), debounceMs);
  }

  async function pull(): Promise<Stamped<T> | null> {
    if (typeof window === "undefined") return null;
    let remote: Stamped<T> | null = null;
    try {
      const res = await fetch(config.endpoint, { method: "GET" });
      if (res.status === 401) {
        disabled = true;
      } else if (res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { state?: T | null; client_updated_at?: number }
          | null;
        if (body?.state != null && typeof body.client_updated_at === "number") {
          remote = { value: body.state, updatedAt: body.client_updated_at };
        }
      }
    } catch {
      // Offline — reconcile against nothing; local wins below.
    }

    const local = config.loadLocal();
    const result = reconcile(local, remote);
    if (result.winner === "remote" && remote) {
      config.saveLocal(remote);
      return remote;
    }
    if (result.winner === "local" && local) {
      if (result.shouldPushLocal && !disabled) push(local);
      return local;
    }
    return null;
  }

  return { pull, push, flush, isDisabled: () => disabled };
}
