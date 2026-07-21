"use client";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { Sparkline } from "@/components/ui/Sparkline";
import { StatTile } from "@/components/ui/StatTile";

interface Payment {
  amount: number;
  created_at: string;
  status: string;
}

interface RevenueSectionProps {
  initialPayments?: Payment[];
}

export function RevenueSection({ initialPayments = [] }: RevenueSectionProps) {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentPayments = initialPayments.filter(
    (p) => new Date(p.created_at).getTime() >= thirtyDaysAgo && p.status === "succeeded",
  );

  const totalRevenueCents = recentPayments.reduce((s, p) => s + p.amount, 0);
  const totalRevenueDollars = (totalRevenueCents / 100).toFixed(2);
  const paymentCount = recentPayments.length;
  const avgPayment = paymentCount > 0 ? (totalRevenueCents / paymentCount / 100).toFixed(2) : "0.00";

  const dailyRevenue: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = Date.now() - (i + 1) * 24 * 60 * 60 * 1000;
    const dayEnd = Date.now() - i * 24 * 60 * 60 * 1000;
    const dayTotal = recentPayments
      .filter((p) => { const t = new Date(p.created_at).getTime(); return t >= dayStart && t < dayEnd; })
      .reduce((s, p) => s + p.amount, 0);
    dailyRevenue.push(dayTotal / 100);
  }

  return (
    <div className="glass p-6">
      <SectionHeader eyebrow="Revenue" title="30-day revenue" />
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Total revenue"
          value={`$${totalRevenueDollars}`}
          accent="#22d3ee"
          footer="Last 30 days"
          spark={dailyRevenue.some((v) => v > 0) ? <Sparkline id="revenue" values={dailyRevenue} color="#22d3ee" /> : undefined}
        />
        <StatTile label="Payments" value={String(paymentCount)} accent="#34d399" footer="Successful transactions" />
        <StatTile label="Avg. payment" value={`$${avgPayment}`} accent="#facc15" footer="Per transaction" />
      </div>
    </div>
  );
}
