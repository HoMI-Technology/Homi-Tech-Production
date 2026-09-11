import Link from "next/link";
import { Wallet } from "lucide-react";
import { HomeSectionV4 } from "@/components/v4/home/HomeSectionV4";
import { HOME_V4_EMPTY_MONEY_FOLLOW, HOME_V4_MONEY_FOLLOW, type HomeV4View } from "@/lib/v4/home-state";

export function MoneyEvidenceV4({ view }: { view: HomeV4View }) {
  return (
    <HomeSectionV4
      kicker="Money"
      data-home-v4-money=""
      aria-label="Money evidence"
      className="v4-support-card"
    >
      <span className="v4-support-icon" aria-hidden>
        <Wallet className="size-4" strokeWidth={1.75} />
      </span>
      <p className="v4-support-line" data-home-v4-money-empty="">
        {view.moneyLine}
      </p>
      <p className="v4-support-follow">
        {view.hasAssessment ? HOME_V4_MONEY_FOLLOW : HOME_V4_EMPTY_MONEY_FOLLOW}
      </p>
      <Link href={view.connectHref} className="v4-support-cta" data-home-v4-connect="">
        {view.connectLabel}
      </Link>
    </HomeSectionV4>
  );
}
