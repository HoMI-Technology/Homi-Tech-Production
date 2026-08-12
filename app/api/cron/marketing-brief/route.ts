import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { safeSecretEquals } from "@/lib/security";
import {
  buildMorningBriefPrompt,
  modelForAction,
  stripNeverSay,
  templateMorningBrief,
  type MorningBriefInput,
} from "@/lib/admin/marketing-agency";
import { CLAIM_LAW_REV } from "@/lib/admin/agency-approvals";
import { env, hasAnthropic } from "@/lib/env";

export const runtime = "nodejs";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

/**
 * Daily CEO morning brief — cron only writes draft brief rows (never approved).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || !safeSecretEquals(auth, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = service();
  if (!db) {
    return NextResponse.json({ error: "Service role not configured." }, { status: 503 });
  }

  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const { count: pending } = await db
    .from("marketing_assets")
    .select("*", { count: "exact", head: true })
    .in("status", ["draft", "in_review"]);

  const { data: assessments } = await db
    .from("assessments")
    .select("user_id, completed_at, created_at")
    .eq("status", "completed")
    .gte("created_at", weekAgo.toISOString())
    .limit(5000);

  const users = new Set<string>();
  let completions = 0;
  for (const row of assessments ?? []) {
    completions += 1;
    if (row.user_id) users.add(row.user_id);
  }

  const { count: accountsLast7 } = await db
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekAgo.toISOString());

  const { count: waitlistTotal } = await db
    .from("waitlist")
    .select("*", { count: "exact", head: true });

  const metrics: MorningBriefInput = {
    uniqueActivated7d: users.size,
    completions7d: completions,
    accountsLast7: accountsLast7 ?? 0,
    cohortRate7d:
      (accountsLast7 ?? 0) >= 5
        ? Math.round((users.size / Math.max(accountsLast7 ?? 1, 1)) * 100)
        : null,
    waitlistTotal: waitlistTotal ?? 0,
    pendingApprovals: pending ?? 0,
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    topChannel: "direct",
  };

  let brief = templateMorningBrief(metrics);
  let source: "model" | "template" = "template";
  const model = modelForAction("morning_brief");

  if (hasAnthropic()) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 500,
          messages: [{ role: "user", content: buildMorningBriefPrompt(metrics) }],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) {
        const data = (await response.json()) as {
          content?: Array<{ type: string; text?: string }>;
        };
        const text = data.content?.find((b) => b.type === "text")?.text ?? "";
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start >= 0 && end > start) {
          const parsed = JSON.parse(text.slice(start, end + 1)) as {
            brief?: string;
            decision?: string;
            decision_href?: string;
          };
          if (parsed.brief && parsed.decision) {
            const b = stripNeverSay(parsed.brief);
            const d = stripNeverSay(parsed.decision);
            if (b.clean && d.clean) {
              brief = {
                brief: b.clean,
                decision: d.clean,
                decision_href: parsed.decision_href || "#approval-queue",
              };
              source = "model";
            }
          }
        }
      }
    } catch (err) {
      console.error("[cron:marketing-brief] model failed", err);
    }
  }

  const body = `${brief.brief}\n\nDecision: ${brief.decision}`;
  const { data: asset, error } = await db
    .from("marketing_assets")
    .insert({
      kind: "brief",
      status: "draft",
      title: `Morning brief ${new Date().toISOString().slice(0, 10)}`,
      body,
      source: source === "model" ? "cron" : "cron",
      model: source === "model" ? model : null,
      agent_id: "strategy",
      created_by: null,
      claim_law_rev: CLAIM_LAW_REV,
      meta: {
        decision: brief.decision,
        decision_href: brief.decision_href,
        metrics,
        generation_source: source,
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("[cron:marketing-brief] insert", error);
    return NextResponse.json({ error: "Insert failed." }, { status: 500 });
  }

  await db.from("marketing_agent_runs").insert({
    action: "morning_brief",
    agent_id: "strategy",
    model: source === "model" ? model : null,
    source,
    actor_id: null,
    asset_id: asset?.id ?? null,
  });

  return NextResponse.json({ ok: true, assetId: asset?.id, source });
}
