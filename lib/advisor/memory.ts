/**
 * One memory — server-side thread persistence for the Companion, on the
 * existing `advisor_conversations` / `advisor_messages` tables (RLS owner-
 * scoped, so a session-bound Supabase client can only ever touch the signed-in
 * user's own thread). The widget and the full-page chat share ONE conversation
 * per user: same friend, same memory, every surface, every device.
 *
 * Persistence is strictly best-effort: a storage failure must never break the
 * conversation itself. Every function swallows errors and returns null.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Title marking the user's single shared Companion thread. */
export const COMPANION_CONVERSATION_TITLE = "Companion";

/** How many messages the history endpoint returns (most recent, in order). */
export const THREAD_LOAD_LIMIT = 50;

export interface CompanionThreadMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CompanionThread {
  conversationId: string;
  messages: CompanionThreadMessage[];
}

/**
 * Loads the signed-in user's Companion thread: the most recently touched
 * conversation and its last THREAD_LOAD_LIMIT messages in chronological
 * order. Returns null when the user has no server-side thread yet (or on any
 * error — the client falls back to its local copy).
 */
export async function loadCompanionThread(supabase: SupabaseClient): Promise<CompanionThread | null> {
  try {
    const { data: convo, error } = await supabase
      .from("advisor_conversations")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !convo) return null;

    const { data: rows, error: msgError } = await supabase
      .from("advisor_messages")
      .select("role, content, created_at")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: false })
      .limit(THREAD_LOAD_LIMIT);
    if (msgError) return null;

    const messages = (rows ?? [])
      .reverse()
      .filter((r): r is { role: "user" | "assistant"; content: string; created_at: string } =>
        (r.role === "user" || r.role === "assistant") && typeof r.content === "string",
      )
      .map((r) => ({ role: r.role, content: r.content }));

    return { conversationId: convo.id as string, messages };
  } catch {
    return null;
  }
}

export interface PersistExchangeInput {
  userId: string;
  /** Client-echoed conversation id; RLS guarantees it can only match the user's own. */
  conversationId?: string | null;
  userMessage: string;
  assistantMessage: string;
  /** Where the reply came from — recorded in message metadata for later eval. */
  source: "model" | "fallback";
  persona: string;
}

/**
 * Appends one user/assistant exchange to the user's Companion thread,
 * creating the conversation on first use. Returns the conversation id, or
 * null when persistence failed (the caller returns the reply regardless).
 *
 * The two messages get explicit created_at stamps 1ms apart so read-back
 * order is deterministic even within one insert statement.
 */
export async function persistCompanionExchange(
  supabase: SupabaseClient,
  input: PersistExchangeInput,
): Promise<string | null> {
  try {
    let conversationId = input.conversationId ?? null;

    if (!conversationId) {
      const { data: existing } = await supabase
        .from("advisor_conversations")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      conversationId = (existing?.id as string | undefined) ?? null;
    }

    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("advisor_conversations")
        .insert({ user_id: input.userId, title: COMPANION_CONVERSATION_TITLE })
        .select("id")
        .single();
      if (error || !created) return null;
      conversationId = created.id as string;
    }

    const now = Date.now();
    const { error: insertError } = await supabase.from("advisor_messages").insert([
      {
        conversation_id: conversationId,
        role: "user",
        content: input.userMessage,
        created_at: new Date(now).toISOString(),
      },
      {
        conversation_id: conversationId,
        role: "assistant",
        content: input.assistantMessage,
        metadata: { source: input.source, persona: input.persona },
        created_at: new Date(now + 1).toISOString(),
      },
    ]);
    if (insertError) return null;

    await supabase
      .from("advisor_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return conversationId;
  } catch {
    return null;
  }
}

/**
 * "Forget this conversation" — deletes the user's Companion conversations
 * (messages cascade). RLS plus the explicit user_id filter mean this can only
 * ever remove the caller's own thread. Returns whether the delete succeeded.
 */
export async function forgetCompanionThread(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("advisor_conversations").delete().eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
}
