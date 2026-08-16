import { Compass, ListOrdered } from 'lucide-react'

/**
 * Section 3 — Timing education (M4). Education only: no advice, no
 * predictions, no market calls. Why the engine weighs horizon and sequence.
 */
export default function TimingEducation() {
  return (
    <section aria-label="Timing">
      <h2 className="text-label">Timing</h2>
      <div className="mt-4 grid grid-cols-12 gap-4">
        <div className="card-chrome col-span-12 border-l-2 border-l-cyan/50 p-5 md:col-span-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan/10 text-cyan-300">
              <Compass size={14} />
            </span>
            <h3 className="text-sm font-semibold text-light">The market vs your life</h3>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-dim">
            Rates and prices move on their own schedule. Your life moves on yours. Timing readiness
            means your horizon is long enough that a bad year is an inconvenience, not a
            catastrophe. That's why the engine weighs years-to-decision, not headlines.
          </p>
        </div>

        <div className="card-chrome col-span-12 border-l-2 border-l-emerald/50 p-5 md:col-span-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
              <ListOrdered size={14} />
            </span>
            <h3 className="text-sm font-semibold text-light">Sequence before you shop</h3>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-dim">
            The order matters: emergency fund → debt load → down payment → shop. Browsing listings
            before the first three are done doesn't speed anything up — it just applies pressure.
            Pressure is measurable, and it lowers your score.
          </p>
        </div>
      </div>
    </section>
  )
}
