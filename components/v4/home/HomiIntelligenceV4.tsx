"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { useAssessmentWalkChrome } from "@/components/v4/assessment/AssessmentWalkChrome";
import {
  V4_SHELL_ACCOUNTS_HREF,
  V4_SHELL_ASSESS_HREF,
  V4_SHELL_BILLS_HREF,
  V4_SHELL_COMPARE_HREF,
  V4_SHELL_LEARN_HREF,
  V4_SHELL_MONEY_HREF,
  V4_SHELL_PATH_HREF,
  V4_SHELL_EMPLOYEE_HREF,
  V4_SHELL_PARTNER_HREF,
  V4_SHELL_SETTINGS_HREF,
  V4_SHELL_TOOLS_HREF,
} from "@/lib/layout/v4-shell";
import {
  V4_ASK_PLACEHOLDER_DECISION,
  V4_ASK_PLACEHOLDER_DEFAULT,
  type V4AssessHomiPrompt,
} from "@/lib/v4/assessment-walk";
import { ASK_V4_PROMPTS, ASK_V4_PROMPTS_MAX } from "@/lib/v4/contextual-homi";

export type HomiV4Surface =
  | "home"
  | "walk"
  | "path"
  | "money"
  | "compare"
  | "ask"
  | "bills"
  | "tools"
  | "learn"
  | "accounts"
  | "settings"
  | "employee"
  | "partner";

export type HomiV4HeaderMode = "brand" | "micro";

type HomiSurfaceMeta = {
  askId: string;
  fallbackHref: string;
  extraClass: string;
  dataAttr: string;
};

const HOMI_SURFACE_META: Record<HomiV4Surface, HomiSurfaceMeta> = {
  home: { askId: "v4-homi-ask", fallbackHref: V4_SHELL_PATH_HREF, extraClass: "", dataAttr: "data-home-v4-homi" },
  walk: {
    askId: "v4-assess-homi-ask",
    fallbackHref: V4_SHELL_ASSESS_HREF,
    extraClass: "v4-assess-homi",
    dataAttr: "data-assessment-v4-homi",
  },
  path: {
    askId: "v4-path-homi-ask",
    fallbackHref: V4_SHELL_PATH_HREF,
    extraClass: "v4-path-homi",
    dataAttr: "data-path-v4-homi",
  },
  money: {
    askId: "v4-money-homi-ask",
    fallbackHref: V4_SHELL_MONEY_HREF,
    extraClass: "v4-money-homi",
    dataAttr: "data-money-v4-homi",
  },
  compare: {
    askId: "v4-compare-homi-ask",
    fallbackHref: V4_SHELL_COMPARE_HREF,
    extraClass: "v4-compare-homi",
    dataAttr: "data-compare-v4-homi",
  },
  ask: {
    askId: "v4-ask-homi-ask",
    fallbackHref: V4_SHELL_PATH_HREF,
    extraClass: "v4-ask-homi",
    dataAttr: "data-ask-v4-homi",
  },
  bills: {
    askId: "v4-bills-homi-ask",
    fallbackHref: V4_SHELL_BILLS_HREF,
    extraClass: "v4-system-homi",
    dataAttr: "data-bills-v4-homi",
  },
  tools: {
    askId: "v4-tools-homi-ask",
    fallbackHref: V4_SHELL_TOOLS_HREF,
    extraClass: "v4-system-homi",
    dataAttr: "data-tools-v4-homi",
  },
  learn: {
    askId: "v4-learn-homi-ask",
    fallbackHref: V4_SHELL_LEARN_HREF,
    extraClass: "v4-system-homi",
    dataAttr: "data-learn-v4-homi",
  },
  accounts: {
    askId: "v4-accounts-homi-ask",
    fallbackHref: V4_SHELL_ACCOUNTS_HREF,
    extraClass: "v4-system-homi",
    dataAttr: "data-accounts-v4-homi",
  },
  settings: {
    askId: "v4-settings-homi-ask",
    fallbackHref: V4_SHELL_SETTINGS_HREF,
    extraClass: "v4-system-homi",
    dataAttr: "data-settings-v4-homi",
  },
  employee: {
    askId: "v4-employee-homi-ask",
    fallbackHref: V4_SHELL_EMPLOYEE_HREF,
    extraClass: "v4-system-homi",
    dataAttr: "data-employee-v4-homi",
  },
  partner: {
    askId: "v4-partner-homi-ask",
    fallbackHref: V4_SHELL_PARTNER_HREF,
    extraClass: "v4-system-homi",
    dataAttr: "data-partner-v4-homi",
  },
};

function homiAskId(surface: HomiV4Surface): string {
  return HOMI_SURFACE_META[surface].askId;
}

function homiFallbackHref(surface: HomiV4Surface): string {
  return HOMI_SURFACE_META[surface].fallbackHref;
}

function homiClassName(surface: HomiV4Surface): string {
  const extra = HOMI_SURFACE_META[surface].extraClass;
  return extra ? `v4-homi ${extra}` : "v4-homi";
}

function homiSurfaceAttr(surface: HomiV4Surface): Record<string, string> {
  return { [HOMI_SURFACE_META[surface].dataAttr]: "" };
}

/**
 * Contextual HōMI — clarity rail. Prompts + Ask. Not a second score.
 * Column in the workspace grid — never a floating overlay.
 * Explain + deep-link only. No Homie. No live-AI typing.
 */
export function HomiIntelligenceV4({
  decisionContext = null,
  commandLabel = null,
  prompts: promptList,
  showContext = true,
  askPlaceholder = V4_ASK_PLACEHOLDER_DECISION,
  surface = "home",
  headerMode = "brand",
}: {
  decisionContext?: string | null;
  commandLabel?: string | null;
  prompts?: readonly V4AssessHomiPrompt[];
  showContext?: boolean;
  askPlaceholder?: string;
  surface?: HomiV4Surface;
  headerMode?: HomiV4HeaderMode;
}) {
  const router = useRouter();
  const { setChrome } = useAssessmentWalkChrome();
  const [query, setQuery] = useState("");
  const contextLine = decisionContext ?? "No decision read yet";
  const catalog = useMemo(
    () => (promptList ?? ASK_V4_PROMPTS.default).slice(0, ASK_V4_PROMPTS_MAX),
    [promptList],
  );
  const askId = homiAskId(surface);
  const chromeLabel = commandLabel ?? decisionContext;

  useEffect(() => {
    if (surface === "walk") return;
    setChrome({
      commandLabel: chromeLabel,
      askPlaceholder,
      prompts: catalog,
    });
    return () =>
      setChrome({
        commandLabel: null,
        askPlaceholder: V4_ASK_PLACEHOLDER_DEFAULT,
        prompts: [],
      });
  }, [askPlaceholder, catalog, chromeLabel, setChrome, surface]);

  const prompts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    const filtered = catalog.filter((prompt) => prompt.label.toLowerCase().includes(q));
    return filtered.length > 0 ? filtered : catalog;
  }, [catalog, query]);

  function onAsk(e: FormEvent) {
    e.preventDefault();
    const match = prompts[0] ?? catalog[0];
    router.push(match?.href ?? homiFallbackHref(surface));
  }

  return (
    <aside
      className={homiClassName(surface)}
      data-v4-homi-header={headerMode}
      {...homiSurfaceAttr(surface)}
      data-home-v4-homi={surface === "home" ? "" : undefined}
      data-assessment-v4-homi={surface === "walk" ? "" : undefined}
      data-path-v4-homi={surface === "path" ? "" : undefined}
      data-money-v4-homi={surface === "money" ? "" : undefined}
      data-compare-v4-homi={surface === "compare" ? "" : undefined}
      data-ask-v4-homi={surface === "ask" ? "" : undefined}
      data-system-v4-homi={HOMI_SURFACE_META[surface].extraClass === "v4-system-homi" ? "" : undefined}
      aria-label="HōMI"
    >
      <header className="v4-homi-head">
        <div className={`v4-homi-brand${headerMode === "micro" ? " is-micro" : ""}`}>
          {headerMode === "micro" ? null : <Wordmark size="text-base leading-none" />}
          <p className="v4-homi-mode">Clarity</p>
        </div>
        {showContext ? <p className="v4-homi-context">{contextLine}</p> : null}
      </header>

      <ul className="v4-homi-prompts">
        {prompts.map((prompt) => (
          <li key={prompt.label}>
            <Link
              href={prompt.href}
              className="v4-homi-prompt"
              data-home-v4-homi-prompt=""
              data-assessment-v4-homi-prompt={surface === "walk" ? "" : undefined}
              data-path-v4-homi-prompt={surface === "path" ? "" : undefined}
              data-money-v4-homi-prompt={surface === "money" ? "" : undefined}
              data-compare-v4-homi-prompt={surface === "compare" ? "" : undefined}
              data-ask-v4-homi-prompt={surface === "ask" ? "" : undefined}
            >
              <span>{prompt.label}</span>
              <ArrowRight aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
            </Link>
          </li>
        ))}
      </ul>

      <form
        className="v4-homi-ask"
        onSubmit={onAsk}
        data-home-v4-homi-ask-form={surface === "home" ? "" : undefined}
        data-assessment-v4-homi-ask-form={surface === "walk" ? "" : undefined}
        data-path-v4-homi-ask-form={surface === "path" ? "" : undefined}
        data-money-v4-homi-ask-form={surface === "money" ? "" : undefined}
        data-compare-v4-homi-ask-form={surface === "compare" ? "" : undefined}
        data-ask-v4-homi-ask-form={surface === "ask" ? "" : undefined}
      >
        <label className="sr-only" htmlFor={askId}>
          Ask HōMI
        </label>
        <Search aria-hidden className="v4-homi-ask-icon size-4" strokeWidth={1.75} />
        <input
          id={askId}
          data-v4-homi-ask=""
          data-home-v4-homi-ask={surface === "home" ? "" : undefined}
          data-assessment-v4-homi-ask={surface === "walk" ? "" : undefined}
          data-path-v4-homi-ask={surface === "path" ? "" : undefined}
          data-money-v4-homi-ask={surface === "money" ? "" : undefined}
          data-compare-v4-homi-ask={surface === "compare" ? "" : undefined}
          data-ask-v4-homi-ask={surface === "ask" ? "" : undefined}
          data-bills-v4-homi-ask={surface === "bills" ? "" : undefined}
          data-tools-v4-homi-ask={surface === "tools" ? "" : undefined}
          data-learn-v4-homi-ask={surface === "learn" ? "" : undefined}
          data-accounts-v4-homi-ask={surface === "accounts" ? "" : undefined}
          data-settings-v4-homi-ask={surface === "settings" ? "" : undefined}
          data-employee-v4-homi-ask={surface === "employee" ? "" : undefined}
          data-partner-v4-homi-ask={surface === "partner" ? "" : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={askPlaceholder}
          className="v4-homi-ask-input"
          autoComplete="off"
        />
      </form>
    </aside>
  );
}
