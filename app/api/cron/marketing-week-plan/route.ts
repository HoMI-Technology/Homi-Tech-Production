import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { safeSecretEquals } from "@/lib/security";
import {
  buildWeekPlanPrompt,
  modelForAction,
  stripNeverSay,
  templateWeekPlan,
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

/** Saturday week-plan cron — slots only (draft week_slot assets, never approved). */
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

  let slots = templateWeekPlan().slots;
  let source: "model" | "template" = "template";
  const model = modelForAction("week_plan");

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
          max_tokens: 1200,
          messages: [{ role: "user", content: buildWeekPlanPrompt() }],
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
            slots?: Array<{
              day?: string;
              theme?: string;
              topic?: string;
              campaign?: string;
              platform?: string;
            }>;
          };
          if (Array.isArray(parsed.slots) && parsed.slots.length > 0) {
            const next = parsed.slots
              .slice(0, 7)
              .map((s) => {
                const topic = stripNeverSay(s.topic ?? "").clean;
                if (!topic) return null;
                return {
                  day: s.day || "Mon",
                  theme: s.theme || "Product / Path",
                  topic,
                  campaign: (s.campaign || "week_slot").replace(/\s+/g, "_").toLowerCase(),
                  platform: (s.platform || "x") as "x" | "tiktok" | "linkedin",
                };
              })
              .filter((s): s is NonNullable<typeof s> => Boolean(s));
            if (next.length > 0) {
              slots = next;
              source = "model";
            }
          }
        }
      }
    } catch (err) {
      console.error("[cron:marketing-week-plan] model failed", err);
    }
  }

  const rows = slots.map((s) => ({
    kind: "week_slot" as const,
    status: "draft" as const,
    platform: s.platform,
    title: `${s.day}: ${s.theme}`,
    body: s.topic,
    source: "cron" as const,
    model: source === "model" ? model : null,
    agent_id: "calendar",
    created_by: null,
    claim_law_rev: CLAIM_LAW_REV,
    meta: { campaign: s.campaign, day: s.day, theme: s.theme, generation_source: source },
  }));

  const { data, error } = await db.from("marketing_assets").insert(rows).select("id");
  if (error) {
    console.error("[cron:marketing-week-plan] insert", error);
    return NextResponse.json({ error: "Insert failed." }, { status: 500 });
  }

  await db.from("marketing_agent_runs").insert({
    action: "week_plan",
    agent_id: "calendar",
    model: source === "model" ? model : null,
    source,
    actor_id: null,
    meta: { slots: slots.length },
  });

  return NextResponse.json({ ok: true, created: data?.length ?? 0, source });
}
