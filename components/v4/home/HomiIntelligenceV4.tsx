"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { HOME_V4_HOMI_PROMPTS } from "@/lib/v4/home-state";

/**
 * Contextual HōMI — clarity rail. Prompts + Ask. Not a second score.
 * No AssessmentResult engineering language. No educational disclaimer strip.
 */
export function HomiIntelligenceV4({
  decisionContext = null,
}: {
  decisionContext?: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const contextLine = decisionContext ?? "No decision read yet";

  const prompts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HOME_V4_HOMI_PROMPTS;
    const filtered = HOME_V4_HOMI_PROMPTS.filter((prompt) => prompt.label.toLowerCase().includes(q));
    return filtered.length > 0 ? filtered : HOME_V4_HOMI_PROMPTS;
  }, [query]);

  function onAsk(e: FormEvent) {
    e.preventDefault();
    const match = prompts[0] ?? HOME_V4_HOMI_PROMPTS[0];
    router.push(match?.href ?? "/path");
  }

  return (
    <aside className="v4-homi" data-home-v4-homi="" aria-label="HōMI">
      <header className="v4-homi-head">
        <div className="v4-homi-brand">
          <Wordmark size="text-base leading-none" />
          <p className="v4-homi-mode">Clarity</p>
        </div>
        <p className="v4-homi-context">{contextLine}</p>
      </header>

      <ul className="v4-homi-prompts">
        {prompts.map((prompt) => (
          <li key={prompt.label}>
            <Link href={prompt.href} className="v4-homi-prompt" data-home-v4-homi-prompt="">
              <span>{prompt.label}</span>
              <ArrowRight aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
            </Link>
          </li>
        ))}
      </ul>

      <form className="v4-homi-ask" onSubmit={onAsk} data-home-v4-homi-ask-form="">
        <label className="sr-only" htmlFor="v4-homi-ask">
          Ask HōMI
        </label>
        <Search aria-hidden className="v4-homi-ask-icon size-4" strokeWidth={1.75} />
        <input
          id="v4-homi-ask"
          data-home-v4-homi-ask=""
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask HōMI about this decision..."
          className="v4-homi-ask-input"
        />
      </form>
    </aside>
  );
}
