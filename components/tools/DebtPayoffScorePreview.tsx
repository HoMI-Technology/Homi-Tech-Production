import { debtPayoffPreviewLines } from "@/lib/finance/debt-payoff-preview";

/**
 * Directional preview after a debt-payoff plan. Locked shapes only.
 * Empty of numbers. This is not a HōMI Score write.
 */
export function DebtPayoffScorePreview(input: {
  monthlyIncome: number | null;
  currentMonthlyDebt: number | null;
  remainingMonthlyDebt: number | null;
  currentRunwayMonths: number | null;
  projectedRunwayMonths: number | null;
}) {
  const lines = debtPayoffPreviewLines(input);
  return (
    <div
      data-debt-payoff-preview=""
      className="glass mt-8 p-6"
    >
      <ul className="space-y-1 text-sm leading-relaxed text-dim">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
