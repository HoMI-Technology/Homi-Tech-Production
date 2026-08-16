import { motion } from 'framer-motion'
import { BuildPathProvider } from '@/store/buildpath'
import ModulesSection from '@/components/buildpath/ModulesSection'
import ClarityChecklist from '@/components/buildpath/ClarityChecklist'
import TimingEducation from '@/components/buildpath/TimingEducation'
import ShockCards from '@/components/buildpath/ShockCards'
import CadenceCard from '@/components/buildpath/CadenceCard'

const reveal = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: 'easeOut' as const },
})

/**
 * The Build Path — /buildpath.
 *
 * Section 1 is HōMI's canonical Path-to-Ready engine (src/lib/path.ts):
 * binding-constraint sequenced steps, 60-second pre-flight gate, live
 * evidence-based auto-completion, freshness + versioning, markdown export.
 * Below it, the sections canon doesn't cover stay as-is: M5 clarity
 * checklist, M4 timing education, M2 shock resilience, M8 cadence
 * (anchor id="cadence").
 *
 * The BuildPathProvider wraps the page here so the route wiring in App.tsx
 * (owned by integration) stays untouched.
 */
export default function BuildPath() {
  return (
    <BuildPathProvider>
      <div className="flex flex-col gap-10">
        {/* hero */}
        <motion.header {...reveal(0)}>
          <p className="text-label">The Build Path</p>
          <h1 className="mt-3 font-serif text-3xl italic leading-snug text-light md:text-4xl">
            This is the part we build first.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">
            A finite path, not a forever app. Each module has a definition of done.
          </p>
        </motion.header>

        <motion.div {...reveal(1)}>
          <ModulesSection />
        </motion.div>

        <motion.div {...reveal(2)}>
          <ClarityChecklist />
        </motion.div>

        <motion.div {...reveal(3)}>
          <TimingEducation />
        </motion.div>

        <motion.div {...reveal(4)}>
          <ShockCards />
        </motion.div>

        <motion.div {...reveal(5)}>
          <CadenceCard />
        </motion.div>

        {/* footer disclaimer strip — verbatim legal block (required on score surfaces) */}
        <motion.div {...reveal(6)}>
          <div className="mx-auto max-w-3xl border-t border-white/[0.06] pt-4 text-center text-xs leading-relaxed text-dim/80">
            <p>
              HōMI is a product of HOMI TECHNOLOGIES LLC. HōMI is not a lender, mortgage broker,
              registered investment advisor, credit bureau, real estate agent or brokerage,
              financial planner, bank or deposit institution, or product recommendation engine.
              HōMI provides educational guidance only and does not provide financial, legal, tax,
              mortgage, real estate, or investment advice.
            </p>
          </div>
        </motion.div>
      </div>
    </BuildPathProvider>
  )
}
