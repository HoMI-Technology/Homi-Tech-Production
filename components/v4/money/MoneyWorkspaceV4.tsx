"use client";

import Link from "next/link";
import { useEffect } from "react";
import { COLORS } from "@/lib/brand";
import { HomiIntelligenceV4 } from "@/components/v4/home/HomiIntelligenceV4";
import { useAssessmentWalkChrome } from "@/components/v4/assessment/AssessmentWalkChrome";
import {
  V4_ASK_PLACEHOLDER_DEFAULT,
} from "@/lib/v4/assessment-walk";
import {
  MONEY_V4_CRAFT_EYEBROW,
  MONEY_V4_LIQUID_SUB,
  V4_ASK_PLACEHOLDER_MONEY,
  moneyV4FormatLiveUsd,
  type MoneyV4Account,
  type MoneyV4View,
} from "@/lib/v4/money-workspace";

function LiveAmount({
  cents,
  alwaysCents,
  className,
}: {
  cents: number;
  alwaysCents?: boolean;
  className: string;
}) {
  return (
    <span className={className} data-money-v4-live-amount="">
      {moneyV4FormatLiveUsd(cents, alwaysCents)}
    </span>
  );
}

function AccountRow({ account }: { account: MoneyV4Account }) {
  return (
    <li className="v4-money-account" data-money-v4-account="">
      <div className="v4-money-account-copy">
        <p className="v4-money-account-name">
          {account.name} · {account.institution}
        </p>
        <p className="v4-money-account-type">{account.typeLabel}</p>
      </div>
      {account.cents != null && account.currency === "USD" ? (
        <LiveAmount cents={account.cents} alwaysCents className="v4-money-account-amount" />
      ) : (
        <span className="v4-money-account-unknown" data-money-v4-amount-unknown="">
          {account.cents == null ? "—" : `${account.cents / 100} ${account.currency}`}
        </span>
      )}
    </li>
  );
}

function ConnectCta({ view }: { view: MoneyV4View }) {
  return (
    <div className="v4-money-actions">
      <Link
        href={view.connectHref}
        className="btn btn-primary v4-hero-primary"
        data-money-v4-connect=""
      >
        {view.connectLabel}
      </Link>
    </div>
  );
}

function PictureBody({ view }: { view: MoneyV4View }) {
  if (view.hasLiveRows) {
    const ageBits = [view.ageLabel];
    if (view.isCraftFixture) ageBits.push(MONEY_V4_CRAFT_EYEBROW);
    return (
      <section data-money-v4-connected="" aria-label="Money">
        {view.hardStopActive ? null : <h1 className="sr-only">Money</h1>}
        <p className="v4-money-age" data-money-v4-age="">
          {ageBits.join(" · ")}
        </p>
        {view.liquidCents != null ? (
          <p className="v4-money-hero" data-money-v4-liquid="">
            <LiveAmount cents={view.liquidCents} className="v4-money-hero-amount" />
          </p>
        ) : (
          <p className="v4-money-hero-empty" data-money-v4-liquid-empty="">
            Liquid cash waits on live rows.
          </p>
        )}
        <p className="v4-money-sub">{MONEY_V4_LIQUID_SUB}</p>
        <ul className="v4-money-accounts" aria-label="Connected accounts">
          {view.accounts.map((account) => (
            <AccountRow key={account.id} account={account} />
          ))}
        </ul>
        {view.honestyLine ? (
          <p className="v4-money-honesty" data-money-v4-honesty="">
            {view.honestyLine}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section data-money-v4-empty="">
      {view.hardStopActive ? (
        <h2 className="v4-money-empty-title">{view.emptyTitle}</h2>
      ) : (
        <h1 className="v4-money-title">{view.emptyTitle}</h1>
      )}
      <p className="v4-money-body">{view.emptyBody}</p>
      <ConnectCta view={view} />
    </section>
  );
}

export function MoneyWorkspaceV4({ view }: { view: MoneyV4View }) {
  const { setChrome } = useAssessmentWalkChrome();

  useEffect(() => {
    setChrome({
      commandLabel: view.decisionContext,
      askPlaceholder: V4_ASK_PLACEHOLDER_MONEY,
    });
    return () =>
      setChrome({
        commandLabel: null,
        askPlaceholder: V4_ASK_PLACEHOLDER_DEFAULT,
      });
  }, [setChrome, view.decisionContext]);

  return (
    <div className="v4-money" data-money-v4="" data-money-v4-kind={view.kind}>
      <div className="v4-money-grid" data-money-v4-grid="">
        <div className="v4-money-main">
          {view.hardStopActive ? (
            <section
              data-money-v4-hard-stop=""
              aria-label="Hard stop"
            >
              {view.verdictLabel ? (
                <p
                  className="v4-hero-verdict"
                  data-money-v4-verdict=""
                  style={{
                    color: COLORS.crimson,
                    borderColor: COLORS.crimson,
                  }}
                >
                  {view.verdictLabel}
                </p>
              ) : null}
              {view.holdLead ? <h1 className="v4-money-title">{view.holdLead}</h1> : null}
              {view.holdMeta ? <p className="v4-money-meta">{view.holdMeta}</p> : null}
            </section>
          ) : null}
          <PictureBody view={view} />
        </div>
        <HomiIntelligenceV4
          surface="money"
          showContext={false}
          prompts={view.prompts}
          askPlaceholder={V4_ASK_PLACEHOLDER_MONEY}
        />
      </div>
    </div>
  );
}
