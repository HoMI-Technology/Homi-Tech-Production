import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { NON_POSITIONING } from '@/components/trust/legal'

const TIERS = [
  {
    name: 'Assessment',
    tagline: 'one decision',
    blurb: 'One full readiness assessment, the verdict, and the build path.',
    price: '$ —',
    cadence: 'one-time',
  },
  {
    name: 'Companion',
    tagline: "the year you're building",
    blurb: 'Re-checks, build modules, shock tests, and the full decision record while you build.',
    price: '—',
    cadence: '/ month',
  },
  {
    name: 'Household',
    tagline: 'two people, one verdict',
    blurb: 'Everything in Companion, plus partner mode and the alignment conversation.',
    price: '—',
    cadence: '/ month',
  },
]

const PRINCIPLES = [
  'No CPA offers, ever',
  'Cancel in two clicks, no retention maze',
  'Prices on the page, not in a call',
  'Your data is never the product',
]

const reveal = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: 'easeOut' as const },
})

/** Pricing — M9 aligned packaging. No invented numbers: em-dash placeholders. */
export default function Pricing() {
  return (
    <div className="flex flex-col gap-10">
      {/* hero */}
      <motion.div {...reveal(0)} className="max-w-2xl">
        <p className="text-label">Pricing</p>
        <h1 className="mt-3 font-serif text-[34px] italic leading-[1.15] text-light md:text-[44px]">
          Aligned, or it doesn&rsquo;t ship.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">
          HōMI makes money when you get clarity — never when you get a mortgage offer.
        </p>
      </motion.div>

      {/* honest state banner */}
      <motion.div
        {...reveal(1)}
        className="rounded-r-2xl border-y border-r border-white/[0.06] border-l-2 border-l-amber bg-slate/60 px-5 py-4"
      >
        <p className="text-sm leading-relaxed text-dim">
          This build is a local preview — everything works, nothing is billed. Payments arrive
          with accounts.
        </p>
      </motion.div>

      {/* tiers */}
      <motion.div {...reveal(2)} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className="card-chrome flex flex-col p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12]"
          >
            <p className="text-label">{tier.tagline}</p>
            <h2 className="mt-2 text-lg font-bold text-light">{tier.name}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-dim">{tier.blurb}</p>
            <div className="mt-6 flex items-baseline gap-2 border-t border-white/[0.06] pt-4">
              <span className="font-display text-[28px] font-semibold text-light tnum">
                {tier.price}
              </span>
              <span className="text-xs text-dim">{tier.cadence}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* principles */}
      <motion.div
        {...reveal(3)}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {PRINCIPLES.map((p) => (
          <div key={p} className="flex items-center gap-2.5">
            <Check size={15} className="shrink-0 text-emerald" />
            <span className="text-sm text-dim">{p}</span>
          </div>
        ))}
      </motion.div>

      {/* non-positioning footer — verbatim */}
      <motion.div {...reveal(4)} className="border-t border-white/[0.06] pt-5">
        <p className="text-xs leading-relaxed text-dim/80">{NON_POSITIONING}</p>
      </motion.div>
    </div>
  )
}
