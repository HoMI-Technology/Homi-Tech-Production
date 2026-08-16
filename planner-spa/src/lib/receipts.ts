/* ------------------------------------------------------------------ */
/* Readiness receipts — local port of canon lib/receipts (B2B v1).     */
/*                                                                     */
/* Canon signs receipts server-side with RECEIPT_SIGNING_SECRET so a  */
/* partner can verify offline. This build has no server, so the key   */
/* is generated PER DEVICE and stored in localStorage                 */
/* (`homi-receipt-key-v1`). Honest consequence, stated in the UI: a   */
/* receipt proves only that it was not altered since THIS device      */
/* issued it — it proves nothing about identity or current readiness, */
/* and no third party can verify it without this device.              */
/*                                                                     */
/* Coarse banding is canon-exact: a receipt carries verdict + bands   */
/* + timestamp, never the exact score or underlying financials.       */
/* ------------------------------------------------------------------ */

import type { ScoreResult, VerdictKey } from '@/lib/score'

/* -------- canon coarse bands (verbatim from canon lib/receipts) -------- */

/** Coarse score band. Deliberately lossy — partners get a signal, not a score. */
export type ScoreBand = 'high' | 'moderate' | 'emerging' | 'early'

export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return 'high'
  if (score >= 65) return 'moderate'
  if (score >= 50) return 'emerging'
  return 'early'
}

/** Pillar attainment bucketed to a 3-level band (never the raw sub-score). */
export type PillarBand = 'strong' | 'developing' | 'building'

export function pillarBand(pct: number): PillarBand {
  if (pct >= 75) return 'strong'
  if (pct >= 50) return 'developing'
  return 'building'
}

/* -------- claims -------- */

export interface ReceiptClaims {
  verdict: VerdictKey
  scoreBand: ScoreBand
  pillars: {
    financial: PillarBand
    emotional: PillarBand
    timing: PillarBand
  }
  /** ISO timestamp of issuance. */
  issuedAt: string
  /** SHA-256 hex (truncated) of this device's signing key. */
  deviceKeyId: string
}

export interface SignedReceipt {
  claims: ReceiptClaims
  signature: {
    alg: 'HS256'
    kid: string
    value: string
  } | null
}

const SIGNING_KID = 'homi-receipt-v1'

/** localStorage key holding this device's raw signing key (hex, 32 bytes). */
export const RECEIPT_KEY_STORAGE = 'homi-receipt-key-v1'

/**
 * Canonical JSON — keys emitted in a fixed order so the signature is stable
 * regardless of object construction order (canon pattern). Any drift here
 * breaks verification, so the field list is explicit.
 */
function canonicalize(claims: ReceiptClaims): string {
  return JSON.stringify([
    claims.verdict,
    claims.scoreBand,
    claims.pillars.financial,
    claims.pillars.emotional,
    claims.pillars.timing,
    claims.issuedAt,
    claims.deviceKeyId,
  ])
}

/* -------- encoding helpers -------- */

const textEncoder = new TextEncoder()

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

/** Constant-time byte comparison (canon uses node:timingSafeEqual). */
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/* -------- per-device key -------- */

interface DeviceKey {
  key: CryptoKey
  keyId: string
}

function subtleOrNull(): SubtleCrypto | null {
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) return null
  return globalThis.crypto.subtle
}

function storageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

async function importKey(raw: Uint8Array): Promise<CryptoKey> {
  const subtle = subtleOrNull()
  if (!subtle) throw new Error('WebCrypto unavailable')
  return subtle.importKey('raw', raw as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

async function keyIdFor(raw: Uint8Array): Promise<string> {
  const subtle = subtleOrNull()
  if (!subtle) throw new Error('WebCrypto unavailable')
  const digest = await subtle.digest('SHA-256', raw as BufferSource)
  return bytesToHex(new Uint8Array(digest)).slice(0, 16)
}

/**
 * Load this device's signing key. With `create: true` (issuance) a missing
 * key is generated and persisted; with `create: false` (verification) a
 * missing key returns null — a receipt can never verify on a device that
 * has no key.
 */
async function getDeviceKey(create: boolean): Promise<DeviceKey | null> {
  const subtle = subtleOrNull()
  const storage = storageOrNull()
  if (!subtle || !storage) return null
  try {
    const stored = storage.getItem(RECEIPT_KEY_STORAGE)
    if (stored) {
      const raw = hexToBytes(stored)
      if (!raw || raw.length !== 32) return null
      return { key: await importKey(raw), keyId: await keyIdFor(raw) }
    }
    if (!create) return null
    const raw = new Uint8Array(32)
    globalThis.crypto.getRandomValues(raw)
    storage.setItem(RECEIPT_KEY_STORAGE, bytesToHex(raw))
    return { key: await importKey(raw), keyId: await keyIdFor(raw) }
  } catch {
    return null
  }
}

async function hmac(key: CryptoKey, message: string): Promise<Uint8Array> {
  const subtle = subtleOrNull()
  if (!subtle) throw new Error('WebCrypto unavailable')
  const sig = await subtle.sign('HMAC', key, textEncoder.encode(message))
  return new Uint8Array(sig)
}

/* -------- issue -------- */

/** Build claims from a live ScoreResult — bands only, never the raw score. */
export function receiptClaimsFromResult(result: ScoreResult, deviceKeyId: string): ReceiptClaims {
  return {
    verdict: result.verdict,
    scoreBand: scoreBand(result.score),
    pillars: {
      financial: pillarBand((result.pillars.financial.total / result.pillars.financial.max) * 100),
      emotional: pillarBand((result.pillars.emotional.total / result.pillars.emotional.max) * 100),
      timing: pillarBand((result.pillars.timing.total / result.pillars.timing.max) * 100),
    },
    issuedAt: new Date().toISOString(),
    deviceKeyId,
  }
}

/** Issue + sign a receipt for the current readiness result. */
export async function issueReceipt(result: ScoreResult): Promise<SignedReceipt> {
  const device = await getDeviceKey(true)
  if (!device) return { claims: receiptClaimsFromResult(result, 'unavailable'), signature: null }
  const claims = receiptClaimsFromResult(result, device.keyId)
  const value = bytesToBase64Url(await hmac(device.key, canonicalize(claims)))
  return { claims, signature: { alg: 'HS256', kid: SIGNING_KID, value } }
}

/* -------- verify -------- */

const VERDICTS: readonly string[] = ['READY', 'ALMOST_THERE', 'BUILD_FIRST', 'NOT_YET']
const SCORE_BANDS: readonly string[] = ['high', 'moderate', 'emerging', 'early']
const PILLAR_BANDS: readonly string[] = ['strong', 'developing', 'building']

export type VerifyResult =
  | { ok: true; claims: ReceiptClaims }
  | { ok: false; reason: string }

function asClaims(value: unknown): ReceiptClaims | null {
  if (!value || typeof value !== 'object') return null
  const c = value as Partial<ReceiptClaims>
  if (typeof c.verdict !== 'string' || !VERDICTS.includes(c.verdict)) return null
  if (typeof c.scoreBand !== 'string' || !SCORE_BANDS.includes(c.scoreBand)) return null
  if (!c.pillars || typeof c.pillars !== 'object') return null
  const p = c.pillars as Partial<ReceiptClaims['pillars']>
  if (
    typeof p.financial !== 'string' ||
    !PILLAR_BANDS.includes(p.financial) ||
    typeof p.emotional !== 'string' ||
    !PILLAR_BANDS.includes(p.emotional) ||
    typeof p.timing !== 'string' ||
    !PILLAR_BANDS.includes(p.timing)
  ) {
    return null
  }
  if (typeof c.issuedAt !== 'string' || Number.isNaN(Date.parse(c.issuedAt))) return null
  if (typeof c.deviceKeyId !== 'string' || c.deviceKeyId.length === 0) return null
  return {
    verdict: c.verdict as VerdictKey,
    scoreBand: c.scoreBand as ScoreBand,
    pillars: {
      financial: p.financial as PillarBand,
      emotional: p.emotional as PillarBand,
      timing: p.timing as PillarBand,
    },
    issuedAt: c.issuedAt,
    deviceKeyId: c.deviceKeyId,
  }
}

/**
 * Verify a signed receipt against THIS device's key. Any structural flaw,
 * unknown key, or signature mismatch → not verified (no partial credit).
 */
export async function verifyReceipt(input: string | unknown): Promise<VerifyResult> {
  let parsed: unknown = input
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input)
    } catch {
      return { ok: false, reason: 'Not valid JSON.' }
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'Not a HōMI receipt.' }
  }
  const receipt = parsed as Partial<SignedReceipt>
  const claims = asClaims(receipt.claims)
  if (!claims) return { ok: false, reason: 'Not a HōMI receipt — claims are missing or malformed.' }
  const sig = receipt.signature
  if (
    !sig ||
    sig.alg !== 'HS256' ||
    typeof sig.kid !== 'string' ||
    typeof sig.value !== 'string'
  ) {
    return { ok: false, reason: 'This receipt is unsigned.' }
  }
  if (sig.kid !== SIGNING_KID) {
    return { ok: false, reason: 'Unknown signing scheme.' }
  }
  const device = await getDeviceKey(false)
  if (!device) {
    return { ok: false, reason: 'This device holds no signing key.' }
  }
  const given = base64UrlToBytes(sig.value)
  if (!given) return { ok: false, reason: 'Malformed signature.' }
  const expected = await hmac(device.key, canonicalize(claims))
  if (!timingSafeEqualBytes(expected, given)) {
    return { ok: false, reason: 'Signature mismatch.' }
  }
  return { ok: true, claims }
}

/* -------- download -------- */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Download a signed receipt as `homi-receipt-YYYYMMDD.json`. */
export function downloadReceipt(receipt: SignedReceipt): void {
  if (typeof window === 'undefined') return
  const now = new Date()
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`
  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `homi-receipt-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
