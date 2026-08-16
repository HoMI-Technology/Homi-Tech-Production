import { useEffect, useMemo } from 'react'
import { useAssessmentResult } from '@/store/readiness'
import { buildTrinity } from '@/lib/companions'
import { logEvent } from '@/lib/events'

const SESSION_FLAG = 'homi-companion-viewed'

type Voice = {
  name: string
  role: string
  text: string
}

/**
 * TrinityDebate — "Three voices, one verdict" (companion layer).
 * The Advocate (what the numbers say for you), the Skeptic (what could
 * undo this), and the Arbiter (the balanced read), all rendered from the
 * deterministic fallback on the live result. No LLM, no "AI" framing.
 */
export default function TrinityDebate() {
  const result = useAssessmentResult()
  const trinity = useMemo(() => buildTrinity(result), [result])

  // companion_viewed — once per session, on mount.
  useEffect(() => {
    let alreadyLogged = false
    try {
      alreadyLogged = window.sessionStorage.getItem(SESSION_FLAG) === '1'
      window.sessionStorage.setItem(SESSION_FLAG, '1')
    } catch {
      /* storage unavailable — fall through and log */
    }
    if (!alreadyLogged) {
      logEvent('companion_viewed', { surface: 'trinity', verdict: result.verdict })
    }
    // mount-only by design; verdict is context, not a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const voices: Voice[] = [
    { name: 'The Advocate', role: 'What the numbers say for you', text: trinity.advocate },
    { name: 'The Skeptic', role: 'What could undo this', text: trinity.skeptic },
    { name: 'The Arbiter', role: 'The balanced read', text: trinity.arbiter },
  ]

  return (
    <div className="card-chrome flex flex-col gap-5 border-l-2 border-l-emerald p-5">
      <div className="flex items-center justify-between">
        <span className="text-label">Three voices, one verdict</span>
        <span className="text-label !text-[9px]">Trinity</span>
      </div>

      <div className="flex flex-col gap-5">
        {voices.map((voice) => (
          <div key={voice.name}>
            <p className="font-serif text-base italic text-light">{voice.name}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-dim">{voice.role}</p>
            <p className="mt-2 text-sm leading-relaxed text-light/85">{voice.text}</p>
          </div>
        ))}
      </div>

      <p className="border-t border-white/[0.06] pt-3 font-serif text-[13px] italic text-dim">
        {trinity.alignment}
      </p>
    </div>
  )
}
