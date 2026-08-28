"use client";

import { useMemo, useState } from "react";
import {
  AGENT_INSTRUCTION,
  ASSESSMENT_INPUT_FIELDS,
  EXAMPLE_COMPUTE_REQUEST_LEGACY,
  EXAMPLE_COMPUTE_RESPONSE,
  EXAMPLE_RECEIPT_RESPONSE,
  EXAMPLE_SESSION_RESPONSE,
} from "@/lib/developers/fixtures";

type Tab = "session" | "receipt" | "inputs" | "compute" | "hooks";

const TABS: { id: Tab; label: string }[] = [
  { id: "session", label: "POST share-sessions" },
  { id: "receipt", label: "GET receipts" },
  { id: "inputs", label: "AssessmentInputs" },
  { id: "compute", label: "EXAMPLE compute (legacy)" },
  { id: "hooks", label: "Webhooks (proposed)" },
];

export function Playground() {
  const [tab, setTab] = useState<Tab>("session");
  const [copied, setCopied] = useState<string | null>(null);

  const { req, res, caption } = useMemo(() => {
    if (tab === "compute") {
      return {
        caption:
          "Canned BUILD FIRST (61). Not engine output. Legacy demo shape — rejected by live POST /api/scoring.",
        req: EXAMPLE_COMPUTE_REQUEST_LEGACY,
        res: EXAMPLE_COMPUTE_RESPONSE,
      };
    }
    if (tab === "inputs") {
      return {
        caption:
          "What POST /api/scoring actually parses. The assessment UI sends this, not income/savings/debt dollars. Partners should not POST another person's file here.",
        req: { fields: ASSESSMENT_INPUT_FIELDS },
        res: {
          note: "Live response is score, verdict, pillar breakdowns from the server engine. Not shown as a fake 61.",
        },
      };
    }
    if (tab === "receipt") {
      return {
        caption: "GET /api/v1/receipts/:token with Homi-Purpose: educational_guidance. No raw 0–100.",
        req: {
          method: "GET",
          path: "/api/v1/receipts/{token}",
          headers: {
            Authorization: "Bearer homi_test_example",
            "Homi-Purpose": "educational_guidance",
          },
        },
        res: EXAMPLE_RECEIPT_RESPONSE,
      };
    }
    if (tab === "session") {
      return {
        caption: "How an agent starts: hosted URL, person authenticates on HōMI. Preview example.",
        req: {
          method: "POST",
          path: "/api/v1/share-sessions",
          headers: {
            Authorization: "Bearer homi_test_example",
            "Homi-Purpose": "educational_guidance",
          },
        },
        res: EXAMPLE_SESSION_RESPONSE,
      };
    }
    return {
      caption:
        "Not a live bus. Zip names stay proposed. Receipts product prefers receipt.issued / verified / revoked.",
      req: { proposed_from_zip: ["assessment.completed", "verdict.changed", "path.milestone"] },
      res: { proposed: ["receipt.issued", "receipt.verified", "receipt.revoked"] },
    };
  }, [tab]);

  async function copy(which: "req" | "res") {
    const text = JSON.stringify(which === "req" ? req : res, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="API examples">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`rounded-lg border px-3 py-2 font-mono text-xs font-semibold min-h-10 ${
              tab === t.id
                ? "border-cyan text-cyan bg-cyan/10"
                : "border-slate-high text-dim"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-dim">{caption}</p>
      <p className="font-mono text-xs tracking-widest text-yellow">EXAMPLE</p>
      <div className="grid gap-4 md:grid-cols-2">
        <CodePane
          label="REQUEST"
          value={req}
          copied={copied === "req"}
          onCopy={() => void copy("req")}
        />
        <CodePane
          label="RESPONSE"
          value={res}
          copied={copied === "res"}
          onCopy={() => void copy("res")}
        />
      </div>
      <pre className="overflow-x-auto rounded-xl border border-slate-high bg-navy-light p-4 font-mono text-xs text-light">
        {JSON.stringify(AGENT_INSTRUCTION, null, 2)}
      </pre>
    </div>
  );
}

function CodePane({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: unknown;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-slate-high bg-navy-light px-3 py-2">
        <span className="font-mono text-xs tracking-widest text-dim">{label}</span>
        <button
          type="button"
          className="min-h-6 rounded border border-slate-high px-2 py-1 font-mono text-[11px] text-dim"
          onClick={onCopy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-b-xl border border-slate-high bg-[#071018] p-4 font-mono text-xs leading-relaxed text-light whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
