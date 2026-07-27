/**
 * Paid-media performance math — CAC, ROAS, CPC — over the ad_spend ledger
 * (migration 00037) joined to attributed signups and channel revenue.
 *
 * Everything is pure and cents-based. Division guards return null ("not
 * computable", rendered as —) rather than 0 or Infinity, so a channel with
 * spend-but-no-conversions reads honestly instead of looking free or perfect.
 */

export interface AdSpendLike {
  channel: string;
  spend_cents: number;
  impressions: number;
  clicks: number;
}

/** Total spend in cents across rows. */
export function sumSpendCents(rows: AdSpendLike[]): number {
  return rows.reduce((acc, r) => acc + (Number.isFinite(r.spend_cents) ? r.spend_cents : 0), 0);
}

/** Customer-acquisition cost in cents; null when there are no customers. */
export function cacCents(spendCents: number, customers: number): number | null {
  if (customers <= 0) return null;
  return Math.round(spendCents / customers);
}

/** Cost per click in cents; null when there are no clicks. */
export function cpcCents(spendCents: number, clicks: number): number | null {
  if (clicks <= 0) return null;
  return Math.round(spendCents / clicks);
}

/**
 * Return on ad spend = revenue / spend, as a ratio rounded to 2 decimals.
 * null when there was no spend (undefined return, not infinite).
 */
export function roas(revenueCents: number, spendCents: number): number | null {
  if (spendCents <= 0) return null;
  return Math.round((revenueCents / spendCents) * 100) / 100;
}

/** Per-channel inputs, keyed by channel label. */
export interface ChannelInputs {
  spendCents?: number;
  impressions?: number;
  clicks?: number;
  signups?: number;
  paid?: number;
  revenueCents?: number;
}

export interface ChannelPerformanceRow {
  channel: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  signups: number;
  paid: number;
  revenueCents: number;
  /** CAC against paid customers (null when no paid customers). */
  cacCents: number | null;
  /** ROAS against channel revenue (null when no spend). */
  roas: number | null;
  /** CPC (null when no clicks). */
  cpcCents: number | null;
}

/**
 * Merge per-channel spend/conversion/revenue maps into performance rows,
 * sorted by spend desc then channel asc. Channels present in ANY input map
 * appear (a channel with signups but no logged spend still shows, and vice
 * versa) so gaps in spend logging are visible rather than hidden.
 */
export function computeChannelPerformance(
  byChannel: Record<string, ChannelInputs>,
): ChannelPerformanceRow[] {
  return Object.entries(byChannel)
    .map(([channel, v]) => {
      const spendCents = v.spendCents ?? 0;
      const paid = v.paid ?? 0;
      const revenueCents = v.revenueCents ?? 0;
      const clicks = v.clicks ?? 0;
      return {
        channel,
        spendCents,
        impressions: v.impressions ?? 0,
        clicks,
        signups: v.signups ?? 0,
        paid,
        revenueCents,
        cacCents: cacCents(spendCents, paid),
        roas: roas(revenueCents, spendCents),
        cpcCents: cpcCents(spendCents, clicks),
      };
    })
    .sort((a, b) => b.spendCents - a.spendCents || a.channel.localeCompare(b.channel));
}

/** Blended CAC across all channels in cents; null when no customers. */
export function blendedCacCents(rows: ChannelPerformanceRow[]): number | null {
  const spend = rows.reduce((acc, r) => acc + r.spendCents, 0);
  const paid = rows.reduce((acc, r) => acc + r.paid, 0);
  return cacCents(spend, paid);
}
