"use client";

import { useEffect, useId, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  WEBHOOK_BUFFER_KEY,
  WEBHOOK_MAKE_KEY,
  buildWebhookPayload,
  isValidWebhookUrl,
  type SocialPlatform,
  type WebhookTarget,
} from "@/lib/admin/marketing-agency";

const TARGET_KEYS: Record<WebhookTarget, string> = {
  buffer: WEBHOOK_BUFFER_KEY,
  make: WEBHOOK_MAKE_KEY,
};

const TARGET_LABELS: Record<WebhookTarget, string> = {
  buffer: "Buffer",
  make: "Make",
};

function readWebhook(target: WebhookTarget): string {
  try {
    return window.localStorage.getItem(TARGET_KEYS[target]) ?? "";
  } catch {
    return "";
  }
}

/**
 * Test-only direct webhook POST (settings panel). Real publish must go through
 * /api/admin/marketing-publish with an approved assetId.
 */
async function postToWebhook(url: string, payload: unknown): Promise<string | null> {
  if (!isValidWebhookUrl(url)) return "That webhook URL is not a valid https address.";
  try {
    const response = await fetch(url.trim(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return `Webhook returned ${response.status}.`;
    return null;
  } catch {
    return "Could not reach that webhook. Check the URL and try again.";
  }
}

export type WebhookPublishButtonsProps = {
  platform: SocialPlatform;
  copy: string;
  utmLink: string;
  utmCampaign: string;
  hashtags: string[];
  /** When set, publish is server-gated (must be CEO-approved). */
  assetId?: string | null;
};

/**
 * The publish half, rendered inside the content studio next to "Copy post".
 *
 * Reads the stored URLs at click time rather than on mount — the settings panel
 * is a separate island at the bottom of the page, so a URL saved after this
 * component mounted must still work without a reload.
 */
export function WebhookPublishButtons({
  platform,
  copy,
  utmLink,
  utmCampaign,
  hashtags,
  assetId,
}: WebhookPublishButtonsProps) {
  const [sent, setSent] = useState<WebhookTarget | null>(null);
  const [busy, setBusy] = useState<WebhookTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(target: WebhookTarget) {
    const url = readWebhook(target);
    if (!url) {
      setError(`No ${TARGET_LABELS[target]} webhook saved yet — set one in Publish desk.`);
      return;
    }

    if (!assetId) {
      setError("Queue and approve this draft first — publish is server-gated (CEO eyes).");
      return;
    }

    setBusy(target);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketing-publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId, webhookUrl: url, target }),
      });
      const data = (await res.json()) as { error?: string };
      setBusy(null);
      if (!res.ok) {
        setError(data.error ?? `Publish failed (${res.status}).`);
        return;
      }
      setSent(target);
      window.setTimeout(() => setSent(null), 3000);
    } catch {
      setBusy(null);
      setError("Publish network error.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {(["buffer", "make"] as WebhookTarget[]).map((target) => (
          <button
            key={target}
            type="button"
            className={
              sent === target ? "btn btn-sm border border-emerald/40 text-emerald" : "btn btn-ghost btn-sm"
            }
            onClick={() => void send(target)}
            disabled={!copy || busy !== null || !assetId}
            title={
              assetId
                ? `Publish approved asset via ${TARGET_LABELS[target]}`
                : "Approve in the CEO queue before publishing"
            }
          >
            {sent === target
              ? `Sent to ${TARGET_LABELS[target]}`
              : busy === target
                ? "Sending"
                : `Send to ${TARGET_LABELS[target]}`}
          </button>
        ))}
      </div>
      {!assetId && (
        <p className="text-3xs text-dim">
          Publish disabled until this draft is queued and approved (CEO eyes).
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-crimson">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The settings half — one https URL per destination, kept in this browser.
 *
 * localStorage rather than the database on purpose: a webhook URL is a bearer
 * credential for someone else's account, and it belongs to the operator's
 * machine, not to a table every admin can read.
 */
export function WebhookPublisher() {
  const fieldId = useId();

  const [open, setOpen] = useState(false);
  const [buffer, setBuffer] = useState("");
  const [make, setMake] = useState("");
  const [saved, setSaved] = useState(false);
  const [tested, setTested] = useState<WebhookTarget | null>(null);
  const [busy, setBusy] = useState<WebhookTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBuffer(readWebhook("buffer"));
    setMake(readWebhook("make"));
  }, []);

  function save() {
    try {
      window.localStorage.setItem(WEBHOOK_BUFFER_KEY, buffer.trim());
      window.localStorage.setItem(WEBHOOK_MAKE_KEY, make.trim());
      setSaved(true);
      setError(null);
      window.setTimeout(() => setSaved(false), 1600);
    } catch {
      setError("This browser refused to store the webhook URLs (private mode or quota).");
    }
  }

  async function test(target: WebhookTarget) {
    const url = target === "buffer" ? buffer : make;
    setBusy(target);
    setError(null);
    const failure = await postToWebhook(
      url,
      buildWebhookPayload({
        platform: "x",
        copy: "HōMI webhook test — no post was scheduled.",
        utm_link: "https://homitechnology.com/assessment",
        utm_campaign: "webhook_test",
        hashtags: [],
      }),
    );
    setBusy(null);

    if (failure) {
      setError(failure);
      return;
    }
    setTested(target);
    window.setTimeout(() => setTested(null), 3000);
  }

  const configured = [buffer, make].filter((url) => isValidWebhookUrl(url)).length;

  return (
    <div className="glass mt-8 p-6">
      <SectionHeader
        eyebrow="Publish"
        title="Publish webhooks"
        subtitle="Push finished posts straight into Buffer or Make. URLs stay in this browser."
        action={
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide text-dim">
              {configured} configured
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)}>
              {open ? "Hide settings" : "Settings"}
            </button>
          </div>
        }
      />

      {open && (
        <div className="mt-5 space-y-3">
          {(
            [
              { target: "buffer" as const, value: buffer, set: setBuffer },
              { target: "make" as const, value: make, set: setMake },
            ]
          ).map(({ target, value, set }) => (
            <div key={target} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="block flex-1 text-xs text-dim" htmlFor={`${fieldId}-${target}`}>
                {TARGET_LABELS[target]} webhook URL
                <input
                  id={`${fieldId}-${target}`}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 font-mono text-xs text-light"
                  value={value}
                  spellCheck={false}
                  placeholder="https://…"
                  onChange={(e) => set(e.target.value.slice(0, 500))}
                />
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void test(target)}
                disabled={!isValidWebhookUrl(value) || busy !== null}
              >
                {tested === target ? "Test sent" : busy === target ? "Testing" : "Test"}
              </button>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary btn-sm" onClick={save}>
              {saved ? "Saved" : "Save webhooks"}
            </button>
            <span className="text-xs text-dim">
              Only https endpoints are accepted. A test posts one payload with placeholder copy.
            </span>
          </div>

          {error && (
            <p role="alert" className="text-xs text-crimson">
              {error}
            </p>
          )}
        </div>
      )}

      {!open && (
        <p className="mt-4 text-xs text-dim">
          {configured === 0
            ? "No webhooks configured. Test stays in Settings. Studio primary is Queue / Approve — not Publish."
            : "Webhook test stays settings-only. Studio publish stays gated until the draft is approved."}
        </p>
      )}
    </div>
  );
}
