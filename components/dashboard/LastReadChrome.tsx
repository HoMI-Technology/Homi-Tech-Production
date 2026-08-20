import type { VerdictKey } from "@/lib/brand";
import {
  lastReadAgeFrom,
  publicVerdictLabel,
  type LastReadMoneyInputs,
} from "@/lib/dashboard/last-read-chrome";
import { MoneyPictureDirection } from "@/components/dashboard/MoneyPictureDirection";

/**
 * Existing scored-fold chrome only — not a second card.
 * Last verdict + calendar age. Optional same-way direction lives in a child.
 */
export function LastReadChrome({
  verdict,
  lastReadAt,
  showAge,
  lastMoney,
}: {
  verdict: VerdictKey;
  lastReadAt: string | null;
  showAge: boolean;
  lastMoney: LastReadMoneyInputs | null;
}) {
  const label = publicVerdictLabel(verdict);
  const age = showAge ? lastReadAgeFrom(lastReadAt) : null;

  return (
    <div data-last-read-chrome="" className="min-w-0 text-sm text-dim">
      <p data-last-read-verdict="">
        Last read: {label}
        {age ? ` ${age}` : ""}
      </p>
      {lastMoney ? <MoneyPictureDirection lastMoney={lastMoney} /> : null}
    </div>
  );
}
