/**
 * Admin/privileged-action audit trail.
 *
 * A thin, best-effort wrapper over the `audit_log` table (migration 00002:
 * user_id, action_type, resource_type, resource_id, metadata, created_at).
 * Sensitive admin mutations — sending a broadcast, recording ad spend, role
 * changes — call `logAdminAction` so the `/admin/activity` viewer shows who
 * did what. Logging NEVER blocks or fails the underlying action: an audit
 * insert error is swallowed.
 *
 * Pass any Supabase client that can insert into `audit_log` (the caller's
 * request-scoped server client is fine — the RLS insert policy is
 * insert-own; service-role clients also work for webhook-style callers).
 */

interface AuditClient {
  // Supabase's insert() returns a thenable query builder, not a Promise — hence
  // PromiseLike, so both the SSR client and the service-role client satisfy it.
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  };
}

export interface AdminActionInput {
  /** The acting admin's user id (auth.uid). */
  actorId: string | null | undefined;
  /** Stable verb, dot-namespaced: e.g. "admin.campaign.send", "admin.ad_spend.upsert". */
  action: string;
  /** The kind of thing acted on, e.g. "campaign", "ad_spend", "profile". */
  resourceType?: string;
  /** Identifier of the acted-on row, when there is one. */
  resourceId?: string | number | null;
  /** Small, non-sensitive context bag (counts, audience, channel — never PII/secrets). */
  metadata?: Record<string, unknown>;
}

/**
 * Record a privileged admin action. Best-effort: returns void and never
 * throws, so callers can `await logAdminAction(...)` without a try/catch.
 */
export async function logAdminAction(
  supabase: AuditClient,
  input: AdminActionInput,
): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      user_id: input.actorId ?? null,
      action_type: input.action,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId != null ? String(input.resourceId) : null,
      metadata: input.metadata ?? null,
    });
  } catch {
    // Audit logging is observability, not a gate — never surface its failure.
  }
}
