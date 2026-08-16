import { memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AnimatedNumber from '@/components/AnimatedNumber'
import PulseDot from '@/components/PulseDot'
import ConfidenceChip from '@/components/readiness/ConfidenceChip'
import { VERDICT_META } from '@/lib/score'
import type { ScoreResult, VerdictKey } from '@/lib/score'

/* GEOMETRY LOCK: rings r=85/60/35 + keyhole are canon. A static print replica
 * exists at src/components/trust/CompassMark.tsx — any geometry change here
 * MUST be mirrored there. */
/** Canon verdict colors (trademark-pending — exact, no substitutes). */
export const VERDICT_HEX: Record<VerdictKey, string> = {
  READY: '#34d399',
  ALMOST_THERE: '#facc15',
  BUILD_FIRST: '#fab633',
  NOT_YET: '#f24822', // DO NOT PROCEED
}

const CYAN = '#22d3ee'
const EMERALD = '#34d399'
const YELLOW = '#facc15'

type RingSpec = {
  radius: number
  color: string
  opacity: number
  duration: number
  direction: 'cw' | 'ccw'
  dots: { cx: number; cy: number; r: number }[]
}

/**
 * Canonical ring table — 4:3:2 ratio, never reorder/recolor.
 * Outer cyan (Financial Reality) · Middle emerald (Emotional Truth) · Inner yellow (Perfect Timing).
 */
const RINGS: RingSpec[] = [
  {
    radius: 85,
    color: CYAN,
    opacity: 0.6,
    duration: 20,
    direction: 'cw',
    // four dots at 45° positions
    dots: [
      { cx: 160.1, cy: 39.9, r: 3 },
      { cx: 160.1, cy: 160.1, r: 3 },
      { cx: 39.9, cy: 160.1, r: 3 },
      { cx: 39.9, cy: 39.9, r: 3 },
    ],
  },
  {
    radius: 60,
    color: EMERALD,
    opacity: 0.7,
    duration: 15,
    direction: 'ccw',
    // four dots at cardinal N/E/S/W
    dots: [
      { cx: 100, cy: 40, r: 2.5 },
      { cx: 160, cy: 100, r: 2.5 },
      { cx: 100, cy: 160, r: 2.5 },
      { cx: 40, cy: 100, r: 2.5 },
    ],
  },
  { radius: 35, color: YELLOW, opacity: 0.8, duration: 10, direction: 'cw', dots: [] },
]

/**
 * One compass ring group — full circle + dots that rotate WITH the ring.
 * Perpetual linear spin is isolated here so parent re-renders never reset it.
 */
const CompassRing = memo(function CompassRing({ radius, color, opacity, duration, direction, dots }: RingSpec) {
  return (
    <g
      className="compass-ring-spin"
      style={{
        animationDuration: `${duration}s`,
        animationDirection: direction === 'ccw' ? 'reverse' : 'normal',
      }}
    >
      <circle cx={100} cy={100} r={radius} fill="none" stroke={color} strokeWidth={2} opacity={opacity} />
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={color} />
      ))}
    </g>
  )
})

/**
 * Canonical keyhole center (exact geometry from the master SVG).
 * Default yellow; UNLOCKED (READY) → emerald treatment + gentle 2s pulse —
 * "the compass becomes a key."
 */
function Keyhole({ unlocked }: { unlocked: boolean }) {
  const color = unlocked ? EMERALD : YELLOW
  return (
    <g
      className={unlocked ? 'compass-keyhole-pulse' : undefined}
      style={{ filter: `drop-shadow(0 0 12px ${unlocked ? 'rgba(52,211,153,0.55)' : 'rgba(250,204,21,0.5)'})` }}
    >
      <circle cx={100} cy={96} r={12} stroke={color} strokeWidth={2} fill="none" />
      <rect x={94} y={104} width={12} height={16} rx={2} stroke={color} strokeWidth={2} fill="none" />
      <circle cx={100} cy={96} r={5} fill={color} />
      <rect x={97} y={96} width={6} height={12} fill={color} />
    </g>
  )
}

/**
 * Threshold Compass hero — canonical geometry (200×200 viewBox).
 * Three complete counter-rotating rings, keyhole center, verdict pip
 * (the ONLY place verdict color appears inside the compass),
 * spring HōMI-Score below, crossfading verdict chip + canon line.
 */
export default function ThresholdCompass({ result }: { result: ScoreResult }) {
  const { score, verdict } = result
  const hex = VERDICT_HEX[verdict]
  const meta = VERDICT_META[verdict]
  const ready = verdict === 'READY'

  return (
    <div className="card-chrome card-hairline-top relative flex flex-col items-center overflow-hidden p-6">
      <style>{`
        @keyframes compass-ring-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .compass-ring-spin {
          animation-name: compass-ring-rotate;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes compass-keyhole-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
        .compass-keyhole-pulse { animation: compass-keyhole-pulse 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .compass-ring-spin, .compass-keyhole-pulse { animation: none; }
        }
      `}</style>

      <div className="flex w-full items-center justify-between">
        <span className="text-label">HōMI-Score</span>
        <span className="text-label !text-[9px]">35 · 35 · 30</span>
      </div>

      <svg
        viewBox="0 0 200 200"
        className="mt-2 w-full max-w-[300px]"
        role="img"
        aria-label="HōMI Threshold Compass showing Financial Reality, Emotional Truth, and Perfect Timing around the user at the decision threshold."
        style={{ filter: 'drop-shadow(0 0 30px rgba(34,211,238,0.4))' }}
      >
        <defs>
          <radialGradient id="keyhole-halo">
            <stop offset="0%" stopColor={ready ? EMERALD : YELLOW} stopOpacity="0.28" />
            <stop offset="70%" stopColor={ready ? EMERALD : YELLOW} stopOpacity="0" />
          </radialGradient>
        </defs>

        {RINGS.map((ring, i) => (
          <CompassRing key={i} {...ring} />
        ))}

        {/* soft halo behind the keyhole */}
        <circle cx={100} cy={100} r={30} fill="url(#keyhole-halo)" />

        <Keyhole unlocked={ready} />

        {/* verdict pip — the only verdict color inside the compass */}
        <circle cx={100} cy={100} r={6} fill={hex} stroke="#0a1628" strokeWidth={2} />
      </svg>

      {/* score + inline confidence chip (M2/M10) */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <AnimatedNumber value={score} format={(n) => n.toFixed(1)} className="text-hero-number text-light" />
        <ConfidenceChip score={score} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={verdict}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ backgroundColor: `${hex}1a`, color: hex }}
        >
          <PulseDot color={hex} size={5} />
          {meta.label}
        </motion.span>
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={verdict}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-2 text-center font-serif text-[17px] italic text-dim"
        >
          {meta.line}
        </motion.p>
      </AnimatePresence>

      {/* Dignified results (M3): every NOT_YET verdict pairs with agency. */}
      <AnimatePresence initial={false}>
        {verdict === 'NOT_YET' && (
          <motion.p
            key="not-yet-followup"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-1.5 text-center text-xs font-medium text-light/80"
          >
            This is not a no. It is a not-yet, with a path.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
