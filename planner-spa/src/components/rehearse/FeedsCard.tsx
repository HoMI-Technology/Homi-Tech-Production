import { Link } from 'react-router-dom'
import { ArrowRight, Compass, ListChecks } from 'lucide-react'

/**
 * What this feeds — the rehearsal never ends in itself. Waiting wins →
 * fund the wait on the Build Path; buying wins → clarity checklist.
 */
export default function FeedsCard({ waitingWins }: { waitingWins: boolean }) {
  return (
    <div className="card-chrome card-hairline-top relative overflow-hidden p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.08), transparent 70%)' }}
      />
      <div className="relative">
        <p className="text-label">What this feeds</p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">
          {waitingWins
            ? 'In this model, waiting leaves you stronger. The wait is not idle time — it has a funding plan.'
            : 'In this model, buying now leaves you stronger. Strength on paper still goes through the clarity checklist before it touches a decision.'}
        </p>
        <Link
          to="/buildpath"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan px-4 py-2.5 text-xs font-semibold text-navy shadow-glow-cyan transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {waitingWins ? <Compass size={14} /> : <ListChecks size={14} />}
          {waitingWins ? 'See the wait-12 path' : 'Open the clarity checklist'}
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}
