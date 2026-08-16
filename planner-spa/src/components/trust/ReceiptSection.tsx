import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FileDown, ShieldCheck, ShieldX, Upload } from 'lucide-react'
import { downloadReceipt, issueReceipt, verifyReceipt } from '@/lib/receipts'
import type { VerifyResult } from '@/lib/receipts'
import { useAssessmentResult } from '@/store/readiness'
import { logEvent } from '@/lib/events'

const PROVES_COPY =
  'Verification proves one thing: this file has not been altered since this device issued it.'
const DOES_NOT_PROVE_COPY =
  'It does not prove who you are, that you are still ready today, or anything to a third party — only this browser holds the key.'

function formatIssued(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Readiness receipt — issue (download signed JSON) + verify (paste/upload).
 * The signature key is per-device; the copy above says exactly what that
 * proves and what it does not.
 */
export default function ReceiptSection() {
  const result = useAssessmentResult()
  const [issuing, setIssuing] = useState(false)
  const [issued, setIssued] = useState(false)
  const [paste, setPaste] = useState('')
  const [verdict, setVerdict] = useState<VerifyResult | null>(null)
  const [checking, setChecking] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleIssue = async () => {
    setIssuing(true)
    try {
      const receipt = await issueReceipt(result)
      if (receipt.signature) {
        downloadReceipt(receipt)
        setIssued(true)
        logEvent('receipt_issued', { verdict: receipt.claims.verdict, band: receipt.claims.scoreBand })
      }
    } finally {
      setIssuing(false)
    }
  }

  const handleVerify = async (raw: string) => {
    setChecking(true)
    try {
      setVerdict(await verifyReceipt(raw))
    } finally {
      setChecking(false)
    }
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const text = await file.text()
    setPaste(text)
    await handleVerify(text)
  }

  return (
    <div className="mt-10 max-w-2xl">
      <p className="text-label">Readiness receipt</p>
      <h2 className="mt-3 font-serif text-[24px] italic leading-snug text-light md:text-[28px]">
        Proof you did the work — without the numbers.
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-dim">
        A receipt carries your verdict, a coarse score band, and three pillar bands — never your
        exact score, never the numbers behind it. It is signed by this device, with a key that
        exists only in this browser.
      </p>

      <div className="card-chrome mt-5 p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {/* issue */}
          <div className="max-w-md">
            <h3 className="text-sm font-semibold text-light">Issue a receipt</h3>
            <p className="mt-1 text-sm leading-relaxed text-dim">
              One JSON file, signed by this device. {PROVES_COPY}
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleIssue}
              disabled={issuing}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-[0_0_24px_rgba(34,211,238,0.25)] disabled:opacity-50"
            >
              <FileDown size={15} />
              {issuing ? 'Signing…' : 'Download receipt (JSON)'}
            </motion.button>
            {issued && (
              <p className="mt-2 text-xs text-dim">
                Signed by this device. Keep the file unchanged — any edit breaks the signature.
              </p>
            )}
          </div>

          {/* verify */}
          <div className="max-w-md flex-1">
            <h3 className="text-sm font-semibold text-light">Verify a receipt</h3>
            <p className="mt-1 text-sm leading-relaxed text-dim">
              Upload the file or paste its contents. {DOES_NOT_PROVE_COPY}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/[0.1] px-3.5 py-2 text-xs font-semibold text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
              >
                <Upload size={13} />
                Choose receipt file
              </button>
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                rows={4}
                placeholder='Paste receipt JSON here — {"claims": …, "signature": …}'
                className="w-full rounded-xl border border-white/[0.08] bg-slate/60 px-3 py-2 font-display text-xs text-light placeholder:text-dim/60 focus:border-cyan/40 focus:outline-none"
              />
              <button
                onClick={() => void handleVerify(paste)}
                disabled={checking || paste.trim().length === 0}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-3.5 py-2 text-xs font-semibold text-cyan transition-colors hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShieldCheck size={13} />
                {checking ? 'Verifying…' : 'Verify'}
              </button>
            </div>

            {verdict && (
              <div
                className={
                  verdict.ok
                    ? 'mt-4 rounded-xl border border-emerald/30 bg-emerald/10 p-3.5'
                    : 'mt-4 rounded-xl border border-crimson/30 bg-crimson/10 p-3.5'
                }
              >
                <div className="flex items-center gap-2">
                  {verdict.ok ? (
                    <ShieldCheck size={15} className="shrink-0 text-emerald" />
                  ) : (
                    <ShieldX size={15} className="shrink-0 text-crimson" />
                  )}
                  <p
                    className={
                      verdict.ok
                        ? 'text-sm font-semibold text-emerald'
                        : 'text-sm font-semibold text-crimson'
                    }
                  >
                    {verdict.ok
                      ? `Verified — issued by this device on ${formatIssued(verdict.claims.issuedAt)}.`
                      : 'Not verified — altered or issued elsewhere.'}
                  </p>
                </div>
                {verdict.ok ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-dim">
                    Verdict{' '}
                    <span className="font-display text-light tnum">{verdict.claims.verdict}</span>,
                    score band{' '}
                    <span className="font-display text-light tnum">{verdict.claims.scoreBand}</span>{' '}
                    — integrity confirmed, nothing more. {DOES_NOT_PROVE_COPY}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs leading-relaxed text-dim">{verdict.reason}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
