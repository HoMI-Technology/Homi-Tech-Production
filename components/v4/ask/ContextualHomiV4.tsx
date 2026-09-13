"use client";

import Link from "next/link";
import { COLORS } from "@/lib/brand";
import { HomiIntelligenceV4 } from "@/components/v4/home/HomiIntelligenceV4";
import {
  ASK_V4_EDU_BADGE,
  V4_ASK_PLACEHOLDER_FIELD,
  type AskV4Card,
  type AskV4View,
} from "@/lib/v4/contextual-homi";

function DeepLinkCard({ card }: { card: AskV4Card }) {
  return (
    <li className="v4-ask-card">
      <Link href={card.href} className="v4-ask-card-link" data-ask-v4-card="">
        <p className="v4-ask-card-title">{card.title}</p>
        <p className="v4-ask-card-follow">{card.follow}</p>
        <p className="v4-ask-card-badge">{card.badge}</p>
      </Link>
    </li>
  );
}

/**
 * Contextual HōMI fold — explain + deep-link only.
 * Home stays selected. Never a peer dashboard. No second score. No Homie.
 */
export function ContextualHomiV4({ view }: { view: AskV4View }) {
  return (
    <div className="v4-ask" data-ask-v4="" data-ask-v4-kind={view.kind}>
      <div className="v4-ask-grid" data-ask-v4-grid="">
        <div className="v4-ask-main">
          {view.kind === "hard-stop" ? (
            <section data-ask-v4-hard-stop="" aria-label="Hard stop">
              {view.verdictLabel ? (
                <p
                  className="v4-hero-verdict"
                  data-ask-v4-verdict=""
                  style={{
                    color: COLORS.crimson,
                    borderColor: COLORS.crimson,
                  }}
                >
                  {view.verdictLabel}
                </p>
              ) : null}
              {view.holdLead ? <h1 className="v4-ask-title">{view.holdLead}</h1> : null}
              {view.holdMeta ? <p className="v4-ask-meta">{view.holdMeta}</p> : null}
              <h2 className="v4-ask-hold-title">{view.title}</h2>
              <p className="v4-ask-body">{view.body}</p>
              {view.cta ? (
                <div className="v4-ask-actions">
                  <Link
                    href={view.cta.href}
                    className="btn btn-primary v4-hero-primary"
                    data-ask-v4-cta=""
                  >
                    {view.cta.label}
                  </Link>
                </div>
              ) : null}
            </section>
          ) : view.kind === "empty" ? (
            <section data-ask-v4-empty="">
              <h1 className="v4-ask-title">{view.title}</h1>
              <p className="v4-ask-body">{view.body}</p>
              {view.cta ? (
                <div className="v4-ask-actions">
                  <Link
                    href={view.cta.href}
                    className="btn btn-primary v4-hero-primary"
                    data-ask-v4-cta=""
                  >
                    {view.cta.label}
                  </Link>
                </div>
              ) : null}
            </section>
          ) : (
            <section data-ask-v4-default="">
              {view.ageLabel ? (
                <p className="v4-ask-age" data-ask-v4-age="">
                  {view.ageLabel}
                </p>
              ) : null}
              <h1 className="v4-ask-title">{view.title}</h1>
              <p className="v4-ask-body">{view.body}</p>
              {view.eduBadge ? (
                <p className="sr-only">{view.eduBadge ?? ASK_V4_EDU_BADGE}</p>
              ) : null}
              <ul className="v4-ask-cards" aria-label="Deep links">
                {view.cards.map((card) => (
                  <DeepLinkCard key={card.id} card={card} />
                ))}
              </ul>
            </section>
          )}
        </div>
        <HomiIntelligenceV4
          surface="ask"
          showContext={false}
          commandLabel={view.decisionContext}
          prompts={view.prompts}
          askPlaceholder={V4_ASK_PLACEHOLDER_FIELD}
        />
      </div>
    </div>
  );
}
