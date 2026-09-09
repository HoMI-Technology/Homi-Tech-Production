import Link from "next/link";
import { HomeSectionV4 } from "@/components/v4/home/HomeSectionV4";
import type { HomeV4View } from "@/lib/v4/home-state";

export function MoneyEvidenceV4({ view }: { view: HomeV4View }) {
  return (
    <HomeSectionV4
      kicker="Money"
      data-home-v4-money=""
      aria-label="Money evidence"
      className="v4-support-card"
    >
      <p className="v4-support-line" data-home-v4-money-empty="">
        {view.moneyLine}
      </p>
      <p className="v4-support-follow">Ledger stays empty until accounts connect.</p>
      <Link href={view.connectHref} className="v4-support-cta" data-home-v4-connect="">
        {view.connectLabel}
      </Link>
    </HomeSectionV4>
  );
}
