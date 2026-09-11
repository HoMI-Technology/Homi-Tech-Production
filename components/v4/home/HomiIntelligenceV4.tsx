"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { useAssessmentWalkChrome } from "@/components/v4/assessment/AssessmentWalkChrome";
import {
  V4_SHELL_ASSESS_HREF,
  V4_SHELL_COMPARE_HREF,
  V4_SHELL_MONEY_HREF,
  V4_SHELL_PATH_HREF,
} from "@/lib/layout/v4-shell";
import {
  V4_ASK_PLACEHOLDER_DECISION,
  V4_ASK_PLACEHOLDER_DEFAULT,
  type V4AssessHomiPrompt,
} from "@/lib/v4/assessment-walk";
import { ASK_V4_PROMPTS, ASK_V4_PROMPTS_MAX } from "@/lib/v4/contextual-homi";

export type HomiV4Surface = "home" | "walk" | "path" | "money" | "compare" | "ask";

function homiAskId(surface: HomiV4Surface): string {
  switch (surface) {
    case "home":
      return "v4-homi-ask";
    case "walk":
      return "v4-assess-homi-ask";
    case "path":
      return "v4-path-homi-ask";
    case "money":
      return "v4-money-homi-ask";
    case "compare":
      return "v4-compare-homi-ask";
    case "ask":
      return "v4-ask-homi-ask";
    default: {
      const _exhaustive: never = surface;
      return _exhaustive;
    }
  }
}

function homiFallbackHref(surface: HomiV4Surface): string {
  switch (surface) {
    case "home":
    case "path":
    case "ask":
      return V4_SHELL_PATH_HREF;
    case "walk":
      return V4_SHELL_ASSESS_HREF;
    case "money":
      return V4_SHELL_MONEY_HREF;
    case "compare":
      return V4_SHELL_COMPARE_HREF;
    default: {
      const _exhaustive: never = surface;
      return _exhaustive;
    }
  }
}

function homiClassName(surface: HomiV4Surface): string {
  switch (surface) {
    case "home":
      return "v4-homi";
    case "walk":
      return "v4-homi v4-assess-homi";
    case "path":
      return "v4-homi v4-path-homi";
    case "money":
      return "v4-homi v4-money-homi";
    case "compare":
      return "v4-homi v4-compare-homi";
    case "ask":
      return "v4-homi v4-ask-homi";
    default: {
      const _exhaustive: never = surface;
      return _exhaustive;
    }
  }
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
}: {
  decisionContext?: string | null;
  commandLabel?: string | null;
  prompts?: readonly V4AssessHomiPrompt[];
  showContext?: boolean;
  askPlaceholder?: string;
  surface?: HomiV4Surface;
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
      data-home-v4-homi={surface === "home" ? "" : undefined}
      data-assessment-v4-homi={surface === "walk" ? "" : undefined}
      data-path-v4-homi={surface === "path" ? "" : undefined}
      data-money-v4-homi={surface === "money" ? "" : undefined}
      data-compare-v4-homi={surface === "compare" ? "" : undefined}
      data-ask-v4-homi={surface === "ask" ? "" : undefined}
      aria-label="HōMI"
    >
      <header className="v4-homi-head">
        <div className="v4-homi-brand">
          <Wordmark size="text-base leading-none" />
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
          data-home-v4-homi-ask={surface === "home" ? "" : undefined}
          data-assessment-v4-homi-ask={surface === "walk" ? "" : undefined}
          data-path-v4-homi-ask={surface === "path" ? "" : undefined}
          data-money-v4-homi-ask={surface === "money" ? "" : undefined}
          data-compare-v4-homi-ask={surface === "compare" ? "" : undefined}
          data-ask-v4-homi-ask={surface === "ask" ? "" : undefined}
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
