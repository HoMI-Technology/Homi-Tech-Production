"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COLORS } from "@/lib/brand";
import { HomiIntelligenceV4 } from "@/components/v4/home/HomiIntelligenceV4";
import { useAssessmentWalkChrome } from "@/components/v4/assessment/AssessmentWalkChrome";
import {
  V4_ASK_PLACEHOLDER_DEFAULT,
} from "@/lib/v4/assessment-walk";
import {
  COMPARE_V4_EDU_BADGE,
  V4_ASK_PLACEHOLDER_COMPARE_FIELD,
  type CompareV4Card,
  type CompareV4View,
} from "@/lib/v4/compare-workspace";

function CardCta({ card }: { card: CompareV4Card }) {
  if (card.ctaEmphasis === "primary") {
    return (
      <Link href={card.href} className="btn btn-primary v4-compare-open" data-compare-v4-cta="">
        Open
      </Link>
    );
  }
  return (
    <Link href={card.href} className="v4-compare-open-text" data-compare-v4-cta="">
      Open
    </Link>
  );
}

function ScenarioCard({ card }: { card: CompareV4Card }) {
  return (
    <li className="v4-compare-card" data-compare-v4-card="">
      <div className="v4-compare-card-copy">
        <p className="v4-compare-card-title">{card.title}</p>
        <p className="v4-compare-card-follow">{card.follow}</p>
        <p className="v4-compare-card-badge">{card.badge}</p>
      </div>
      {card.liveAmountLabel ? (
        <span className="v4-compare-live-amount" data-compare-v4-live-amount="">
          {card.liveAmountLabel}
        </span>
      ) : null}
      <CardCta card={card} />
    </li>
  );
}

function ScenarioList({
  view,
  cards,
  showAge,
}: {
  view: CompareV4View;
  cards: CompareV4Card[];
  showAge: boolean;
}) {
  return (
    <section data-compare-v4-list="" aria-label="Compare">
      {showAge && view.ageLabel ? (
        <p className="v4-compare-age" data-compare-v4-age="">
          {view.ageLabel}
        </p>
      ) : null}
      <p
        className="v4-hero-verdict v4-compare-edu"
        data-compare-v4-edu=""
        style={{ color: COLORS.cyan, borderColor: COLORS.cyan }}
      >
        {view.eduBadge ?? COMPARE_V4_EDU_BADGE}
      </p>
      {view.hardStopActive ? (
        <h2 className="v4-compare-list-title">{view.listTitle}</h2>
      ) : (
        <h1 className="v4-compare-title">{view.listTitle}</h1>
      )}
      <p className="v4-compare-sub">{view.listSub}</p>
      <ul className="v4-compare-cards" aria-label="Educational scenarios">
        {cards.map((card) => (
          <ScenarioCard key={card.id} card={card} />
        ))}
      </ul>
      {view.honestyLine ? (
        <p className="v4-compare-honesty" data-compare-v4-honesty="">
          {view.honestyLine}
        </p>
      ) : null}
    </section>
  );
}

function EmptyBody({
  view,
  onStart,
}: {
  view: CompareV4View;
  onStart: () => void;
}) {
  return (
    <section data-compare-v4-empty="">
      {view.hardStopActive ? (
        <h2 className="v4-compare-empty-title">{view.emptyTitle}</h2>
      ) : (
        <h1 className="v4-compare-title">{view.emptyTitle}</h1>
      )}
      <p className="v4-compare-body">{view.emptyBody}</p>
      <div className="v4-compare-actions">
        <button
          type="button"
          className="btn btn-primary v4-hero-primary"
          data-compare-v4-start=""
          onClick={onStart}
        >
          {view.startLabel}
        </button>
      </div>
    </section>
  );
}

export function CompareWorkspaceV4({ view }: { view: CompareV4View }) {
  const { setChrome } = useAssessmentWalkChrome();
  const [started, setStarted] = useState(view.hasLiveCards);

  useEffect(() => {
    setStarted(view.hasLiveCards);
  }, [view.hasLiveCards]);

  useEffect(() => {
    setChrome({
      commandLabel: view.decisionContext,
      askPlaceholder: V4_ASK_PLACEHOLDER_COMPARE_FIELD,
    });
    return () =>
      setChrome({
        commandLabel: null,
        askPlaceholder: V4_ASK_PLACEHOLDER_DEFAULT,
      });
  }, [setChrome, view.decisionContext]);

  const showingCards = view.hasLiveCards || started;
  const cards = view.hasLiveCards ? view.cards : view.catalog;

  return (
    <div className="v4-compare" data-compare-v4="" data-compare-v4-kind={view.kind}>
      <div className="v4-compare-grid" data-compare-v4-grid="">
        <div className="v4-compare-main">
          {view.hardStopActive ? (
            <section data-compare-v4-hard-stop="" aria-label="Hard stop">
              {view.verdictLabel ? (
                <p
                  className="v4-hero-verdict"
                  data-compare-v4-verdict=""
                  style={{
                    color: COLORS.crimson,
                    borderColor: COLORS.crimson,
                  }}
                >
                  {view.verdictLabel}
                </p>
              ) : null}
              {view.holdLead ? <h1 className="v4-compare-title">{view.holdLead}</h1> : null}
              {view.holdMeta ? <p className="v4-compare-meta">{view.holdMeta}</p> : null}
            </section>
          ) : null}
          {showingCards ? (
            <ScenarioList view={view} cards={cards} showAge={view.hasLiveCards} />
          ) : (
            <EmptyBody view={view} onStart={() => setStarted(true)} />
          )}
        </div>
        <HomiIntelligenceV4
          surface="compare"
          showContext={false}
          prompts={view.prompts}
          askPlaceholder={V4_ASK_PLACEHOLDER_COMPARE_FIELD}
        />
      </div>
    </div>
  );
}
