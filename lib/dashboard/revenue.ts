export interface PaymentLike {
  amount: number;
  status: string;
  created_at: string;
}

export function sumSucceededCents(payments: PaymentLike[]): number {
  return payments
    .filter((p) => p.status === "succeeded")
    .reduce((acc, p) => acc + (Number.isFinite(p.amount) ? p.amount : 0), 0);
}

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function dailySucceededCents(
  payments: PaymentLike[],
  days: number,
  now = new Date(),
): { date: string; cents: number }[] {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const p of payments) {
    if (p.status !== "succeeded") continue;
    const key = p.created_at.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + p.amount);
    }
  }

  return Array.from(buckets.entries()).map(([date, cents]) => ({ date, cents }));
}
