/**
 * Emergency runway — pure helper for the Tools lens + metric dictionary.
 * liquid / monthlyOutflow. Zero or negative outflow → Infinity (nothing is
 * draining, so the runway does not end). Non-finite or negative liquid → 0.
 */
export function computeRunwayMonths(liquid: number, monthlyOutflow: number): number {
  if (!Number.isFinite(liquid) || liquid <= 0) return 0;
  if (!Number.isFinite(monthlyOutflow) || monthlyOutflow <= 0) return Number.POSITIVE_INFINITY;
  return liquid / monthlyOutflow;
}

export function formatRunwayMonths(months: number): string {
  if (!Number.isFinite(months)) return "∞";
  if (months >= 100) return "99+ mo";
  return `${months.toFixed(1)} mo`;
}
