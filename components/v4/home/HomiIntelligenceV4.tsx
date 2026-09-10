"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { HOME_V4_HOMI_PROMPTS } from "@/lib/v4/home-state";
import type { V4AssessHomiPrompt } from "@/lib/v4/assessment-walk";

/**
 * Contextual HōMI — clarity rail. Prompts + Ask. Not a second score.
 * No AssessmentResult engineering language. No educational disclaimer strip.
 */
export function HomiIntelligenceV4({
  decisionContext = null,
  prompts: promptList,
  showContext = true,
  askPlaceholder = "Ask HōMI about this decision...",
  surface = "home",
}: {
  decisionContext?: string | null;
  prompts?: readonly V4AssessHomiPrompt[];
  showContext?: boolean;
  askPlaceholder?: string;
  surface?: "home" | "walk" | "path";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const contextLine = decisionContext ?? "No decision read yet";
  const catalog = promptList ?? HOME_V4_HOMI_PROMPTS;

  const prompts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    const filtered = catalog.filter((prompt) => prompt.label.toLowerCase().includes(q));
    return filtered.length > 0 ? filtered : catalog;
  }, [catalog, query]);

  function onAsk(e: FormEvent) {
    e.preventDefault();
    const match = prompts[0] ?? catalog[0];
    router.push(match?.href ?? "/path");
  }

  return (
    <aside
      className={`v4-homi${surface === "home" ? "" : " v4-assess-homi"}`}
      data-home-v4-homi={surface === "home" ? "" : undefined}
      data-assessment-v4-homi={surface === "walk" ? "" : undefined}
      data-path-v4-homi={surface === "path" ? "" : undefined}
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
      >
        <label
          className="sr-only"
          htmlFor={
            surface === "walk"
              ? "v4-assess-homi-ask"
              : surface === "path"
                ? "v4-path-homi-ask"
                : "v4-homi-ask"
          }
        >
          Ask HōMI
        </label>
        <Search aria-hidden className="v4-homi-ask-icon size-4" strokeWidth={1.75} />
        <input
          id={
            surface === "walk"
              ? "v4-assess-homi-ask"
              : surface === "path"
                ? "v4-path-homi-ask"
                : "v4-homi-ask"
          }
          data-home-v4-homi-ask={surface === "home" ? "" : undefined}
          data-assessment-v4-homi-ask={surface === "walk" ? "" : undefined}
          data-path-v4-homi-ask={surface === "path" ? "" : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={askPlaceholder}
          className="v4-homi-ask-input"
        />
      </form>
    </aside>
  );
}
