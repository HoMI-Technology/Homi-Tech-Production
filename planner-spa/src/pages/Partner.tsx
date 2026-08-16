import { useEffect } from 'react'
import { motion } from 'framer-motion'
import ConsentCard from '@/components/partner/ConsentCard'
import PillarDiff from '@/components/partner/PillarDiff'
import SharedVerdictCard from '@/components/partner/SharedVerdictCard'
import AlignmentConversation from '@/components/partner/AlignmentConversation'
import BuildPathCard from '@/components/partner/BuildPathCard'
import PartnerInputsCard from '@/components/partner/PartnerInputsCard'
import DualHouseholdCard from '@/components/partner/DualHouseholdCard'
import { usePartner } from '@/store/partner'
import { useAssessmentInputs } from '@/store/readiness'

const reveal = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: 'easeOut' as const },
})

/**
 * Partner Mode — "Two people, one decision" (module spec, M7).
 * Private answers first, shared math second. All scoring is reused from
 * @/store/readiness; this page adds consent, the pillar diff, and the
 * alignment conversation around the existing engine.
 */
export default function Partner() {
  const { markVisited } = usePartner()
  const inputs = useAssessmentInputs()
  const solo = inputs.partnerAlignment === null

  useEffect(() => {
    markVisited()
  }, [markVisited])

  return (
    <div className="flex flex-col gap-6">
      {/* hero */}
      <motion.div {...reveal(0)}>
        <p className="font-serif text-2xl italic leading-snug text-light md:text-3xl">
          A home is a shared verdict.
        </p>
        <p className="mt-2 text-sm text-dim">
          Private answers first. Shared math second. Nobody is graded.
        </p>
      </motion.div>

      <div className="grid grid-cols-12 gap-6">
        {/* §0 two full reads — the partner's own mini-read + canonical dual-household view */}
        {solo ? (
          <motion.div {...reveal(1)} className="col-span-12">
            <DualHouseholdCard />
          </motion.div>
        ) : (
          <>
            <motion.div {...reveal(1)} className="col-span-12 lg:col-span-5">
              <PartnerInputsCard />
            </motion.div>
            <motion.div {...reveal(2)} className="col-span-12 lg:col-span-7">
              <DualHouseholdCard />
            </motion.div>
          </>
        )}

        {/* §1 consent + model card / §2 pillar diff */}
        <motion.div {...reveal(1)} className="col-span-12 lg:col-span-5">
          <ConsentCard />
        </motion.div>
        <motion.div {...reveal(2)} className="col-span-12 lg:col-span-7">
          <PillarDiff />
        </motion.div>

        {/* §3 shared verdict / §4 alignment conversation */}
        <motion.div {...reveal(3)} className="col-span-12 lg:col-span-5">
          <SharedVerdictCard />
        </motion.div>
        <motion.div {...reveal(4)} className="col-span-12 lg:col-span-7">
          <AlignmentConversation />
        </motion.div>

        {/* §5 joint build path CTA */}
        <motion.div {...reveal(5)} className="col-span-12">
          <BuildPathCard />
        </motion.div>
      </div>
    </div>
  )
}
