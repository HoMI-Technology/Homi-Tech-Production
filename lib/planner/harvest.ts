/**
 * Tax-loss harvest + IRC §1091 wash-sale screen.
 * Educational only — not tax, legal, or investment advice.
 *
 * Flag: harvestDesk (NEXT_PUBLIC_FF_HARVEST_DESK === "true").
 * Do not mount UI or run reports unless the flag is on.
 */

export const WASH_SALE_DAYS = 30;
export const WASH_WINDOW_DAYS = 61;

export type HarvestAccountKind =
  | "brokerage"
  | "roth"
  | "traditional_401k"
  | "hsa"
  | "crypto"
  | "other";

export interface HarvestHolding {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  accountKind: HarvestAccountKind;
  shares: number;
  costBasis: number;
  price: number;
  asOf: string;
  instrument?: "equity" | "option";
  option?: {
    underlying: string;
    right: "call" | "put";
    strike: number;
    expiry: string;
  };
}

export interface HarvestTx {
  type: "income" | "expense";
  category: string;
  note?: string;
  date: string;
}

export interface HarvestEvent {
  id: string;
  symbol: string;
  shares: number;
  price: number;
  proceeds: number;
  realized: number;
  at: string;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayISO(): string {
  return toISODate(new Date());
}
function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}
function daysUntil(iso: string, from = todayISO()): number {
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${iso}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

const TAXABLE: HarvestAccountKind[] = ["brokerage", "other"];
const IRA: HarvestAccountKind[] = ["roth", "traditional_401k"];

export function isTaxableAccount(kind: HarvestAccountKind): boolean {
  return TAXABLE.includes(kind);
}

export function identityKeys(h: HarvestHolding): string[] {
  const keys = new Set<string>();
  const sym = h.symbol.trim().toUpperCase();
  if (sym) keys.add(sym);
  if (h.instrument === "option" && h.option?.underlying) {
    keys.add(h.option.underlying.trim().toUpperCase());
    keys.add(
      `${h.option.underlying.toUpperCase()}|${h.option.right}|${h.option.strike}|${h.option.expiry}`,
    );
  }
  return [...keys];
}

function noteMentions(note: string | undefined, keys: string[]): boolean {
  const n = (note ?? "").toUpperCase();
  if (!n) return false;
  return keys.some((k) => n.includes(k.split("|")[0]!));
}

export function acquisitionDates(
  keys: string[],
  transactions: HarvestTx[],
  holdings: HarvestHolding[],
): string[] {
  const dates: string[] = [];
  for (const t of transactions) {
    const isBuy =
      (t.type === "expense" && t.category === "savings") ||
      (t.type === "income" &&
        t.category === "investments" &&
        /reinvest|drip|dividend/i.test(t.note ?? ""));
    if (!isBuy) continue;
    if (noteMentions(t.note, keys)) dates.push(t.date);
  }
  for (const h of holdings) {
    const overlap = identityKeys(h).some((k) => keys.includes(k));
    if (!overlap) continue;
    if (h.instrument === "option" && h.option?.right === "put") continue;
    dates.push(h.asOf);
  }
  return dates.sort();
}

export function inWashWindow(date: string, saleDate: string): boolean {
  return Math.abs(daysUntil(date, saleDate)) <= WASH_SALE_DAYS;
}

export interface HarvestCandidate {
  holdingId: string;
  symbol: string;
  harvestable: boolean;
  blockedReason: string | null;
  washSale: boolean;
  iraTrap: boolean;
  optionReplacement: boolean;
  unrealized: number;
  stayOutUntil: string;
  replacementHint: string;
}

export function replacementHint(h: HarvestHolding): string {
  if (h.assetClass === "crypto") {
    return "Crypto is generally not treated as §1091 stock or securities today.";
  }
  if (h.instrument === "option") {
    return "A long call on the same underlying can be an option to acquire it.";
  }
  if (h.assetClass === "etf" || h.assetClass === "mutual") {
    return "A similar fund from a different issuer is the usual educational stand-in.";
  }
  return "Stay out of a substantially identical position for 30 days after the sale.";
}

export function evaluateHarvest(
  holdings: HarvestHolding[],
  transactions: HarvestTx[],
  asOf = todayISO(),
): {
  asOf: string;
  candidates: HarvestCandidate[];
  harvestableCount: number;
  harvestableLoss: number;
  iraTraps: number;
} {
  const stayOutUntil = addDaysISO(asOf, WASH_SALE_DAYS);
  const candidates: HarvestCandidate[] = holdings.map((h) => {
    const taxable = isTaxableAccount(h.accountKind);
    const unrealized = h.shares * h.price - h.shares * h.costBasis;
    const keys = identityKeys(h);
    const buys = acquisitionDates(keys, transactions, holdings);
    const recentBuy = buys.filter((d) => inWashWindow(d, asOf)).sort().at(-1);
    const washSale = Boolean(recentBuy && unrealized < 0 && taxable);
    const iraTrap = holdings.some(
      (x) =>
        IRA.includes(x.accountKind) &&
        identityKeys(x).some((k) => keys.includes(k)),
    );
    const optionReplacement = holdings.some(
      (x) =>
        x.id !== h.id &&
        x.instrument === "option" &&
        x.option?.right === "call" &&
        keys.includes(x.option.underlying.toUpperCase()),
    );
    let blockedReason: string | null = null;
    if (h.assetClass === "crypto") blockedReason = "Crypto not screened as §1091.";
    else if (!taxable) blockedReason = "Tax-advantaged account.";
    else if (unrealized >= 0) blockedReason = "No unrealized loss.";
    else if (washSale) blockedReason = `Wash-sale window on ${h.symbol}.`;
    else if (iraTrap)
      blockedReason = "IRA/Roth holds the same symbol (Rev. Rul. 2008-5).";
    else if (optionReplacement)
      blockedReason = "Long call on this underlying is already open.";
    return {
      holdingId: h.id,
      symbol: h.symbol,
      harvestable: blockedReason == null,
      blockedReason,
      washSale,
      iraTrap,
      optionReplacement,
      unrealized,
      stayOutUntil,
      replacementHint: replacementHint(h),
    };
  });
  const harvestable = candidates.filter((c) => c.harvestable);
  return {
    asOf,
    candidates,
    harvestableCount: harvestable.length,
    harvestableLoss: harvestable.reduce((s, c) => s + c.unrealized, 0),
    iraTraps: candidates.filter((c) => c.iraTrap).length,
  };
}

export function buildWeeklyHarvestReport(
  holdings: HarvestHolding[],
  transactions: HarvestTx[],
  harvestLog: HarvestEvent[],
  asOf = todayISO(),
): { asOf: string; lines: string[] } {
  const summary = evaluateHarvest(holdings, transactions, asOf);
  const stayOut = harvestLog
    .map((e) => `${e.symbol} until ${addDaysISO(e.at.slice(0, 10), WASH_SALE_DAYS)}`)
    .join("; ");
  return {
    asOf,
    lines: [
      `HōMI weekly harvest report · ${asOf}`,
      `Educational only — not tax advice.`,
      `Harvestable lots: ${summary.harvestableCount}`,
      `Unrealized loss if sold at mark: ${summary.harvestableLoss.toFixed(2)}`,
      `IRA traps: ${summary.iraTraps}`,
      stayOut ? `Stay out of: ${stayOut}` : "No open post-sale wash clocks.",
      `§1091 window is 30 days before, the sale date, and 30 days after.`,
    ],
  };
}

export function weeklyReportDue(lastAt: string | null, from = todayISO()): boolean {
  if (!lastAt) return true;
  return daysUntil(from, lastAt.slice(0, 10)) >= 7;
}
