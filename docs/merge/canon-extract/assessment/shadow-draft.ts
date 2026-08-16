/**
 * Client-side draft persistence for the Shadow Score funnel (/shadow-score).
 * Same contract as the full assessment draft: versioned localStorage, SSR-safe.
 */

export const SHADOW_DRAFT_KEY = "homi:shadow-draft";
export const SHADOW_DRAFT_VERSION = 1;

export type ShadowCreditBand = "excellent" | "good" | "fair" | "poor";

export interface ShadowDraftForm {
  monthlyGrossIncome: number | null;
  monthlyDebtPayments: number | null;
  emergencyFundChoice: "lt1" | "1to3" | "3to6" | "6plus" | null;
  creditBand: ShadowCreditBand | null;
  confidenceLevel: number;
  fomoLevel: number;
  timeHorizonChoice: "lt3" | "3to6" | "6to12" | "12plus" | null;
}

export const INITIAL_SHADOW_FORM: ShadowDraftForm = {
  monthlyGrossIncome: null,
  monthlyDebtPayments: null,
  emergencyFundChoice: null,
  creditBand: null,
  confidenceLevel: 5,
  fomoLevel: 5,
  timeHorizonChoice: null,
};

export interface ShadowDraft {
  form: ShadowDraftForm;
  index: number;
  updatedAt?: string;
}

interface Envelope {
  version: number;
  form: ShadowDraftForm;
  index: number;
  updatedAt: string;
}

function normalizeForm(partial: Partial<ShadowDraftForm> | null | undefined): ShadowDraftForm {
  return { ...INITIAL_SHADOW_FORM, ...(partial ?? {}) };
}

function clampIndex(index: number, maxInclusive: number): number {
  if (!Number.isFinite(index)) return 0;
  const max = Math.max(0, maxInclusive);
  return Math.min(Math.max(0, Math.floor(index)), max);
}

export function shadowDraftLooksStarted(form: ShadowDraftForm, index: number): boolean {
  if (index > 0) return true;
  return (
    form.monthlyGrossIncome !== null ||
    form.monthlyDebtPayments !== null ||
    form.emergencyFundChoice !== null ||
    form.creditBand !== null ||
    form.timeHorizonChoice !== null ||
    form.confidenceLevel !== INITIAL_SHADOW_FORM.confidenceLevel ||
    form.fomoLevel !== INITIAL_SHADOW_FORM.fomoLevel
  );
}

export function saveShadowDraft(form: ShadowDraftForm, index: number): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: Envelope = {
      version: SHADOW_DRAFT_VERSION,
      form,
      index,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SHADOW_DRAFT_KEY, JSON.stringify(envelope));
  } catch {
    // ignore
  }
}

export function loadShadowDraft(maxStepIndex = 5): ShadowDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SHADOW_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Envelope> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== SHADOW_DRAFT_VERSION) return null;
    if (!parsed.form || typeof parsed.index !== "number") return null;

    const form = normalizeForm(parsed.form);
    const index = clampIndex(parsed.index, maxStepIndex);
    if (!shadowDraftLooksStarted(form, index)) return null;

    return {
      form,
      index,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
    };
  } catch {
    return null;
  }
}

export function clearShadowDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SHADOW_DRAFT_KEY);
  } catch {
    // ignore
  }
}
