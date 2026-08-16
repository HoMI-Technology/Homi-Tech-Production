import {
  Activity,
  ArrowLeftRight,
  EyeOff,
  Flame,
  Home,
  Landmark,
  Layers,
  RefreshCw,
  Scale,
  Snowflake,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Lens registry — names and one-line descriptions copied verbatim     */
/* from the canonical HōMI lens registry (canon/tools/registry.ts).    */
/* ------------------------------------------------------------------ */

export type ToolId =
  | 'affordability'
  | 'apr-compare'
  | 'refinance'
  | 'heloc'
  | 'loan-programs'
  | 'debt-payoff'
  | 'monte-carlo'
  | 'fire'
  | 'roth-conversion'
  | 'blind-budget'

export type ToolCard = {
  id: ToolId
  name: string
  desc: string
  icon: LucideIcon
  accent: string
}

export const TOOL_CARDS: ToolCard[] = [
  {
    id: 'affordability',
    name: 'Affordability',
    desc: 'Three honest comfort tiers — protected, stretch, and red line.',
    icon: Home,
    accent: '#34d399',
  },
  {
    id: 'apr-compare',
    name: 'APR Comparison',
    desc: 'Three offers ranked by cost-inclusive APR, not just the teaser rate.',
    icon: Scale,
    accent: '#22d3ee',
  },
  {
    id: 'refinance',
    name: 'Refinance Break-Even',
    desc: 'When payment savings repay closing costs — and if you’ll still be there.',
    icon: RefreshCw,
    accent: '#facc15',
  },
  {
    id: 'heloc',
    name: 'Home Equity Line',
    desc: 'Borrowable equity after combined loan-to-value caps — not paper equity.',
    icon: Landmark,
    accent: '#34d399',
  },
  {
    id: 'loan-programs',
    name: 'Loan Programs',
    desc: 'Conventional vs FHA vs VA after down payment, MI, and upfront fees.',
    icon: Layers,
    accent: '#22d3ee',
  },
  {
    id: 'debt-payoff',
    name: 'Debt Payoff',
    desc: 'Avalanche vs snowball side by side — interest cost, not slogans.',
    icon: Snowflake,
    accent: '#fab633',
  },
  {
    id: 'monte-carlo',
    name: 'Monte Carlo Projection',
    desc: '1,000 simulated futures — markets don’t move in a straight line.',
    icon: Activity,
    accent: '#22d3ee',
  },
  {
    id: 'fire',
    name: 'FIRE Number',
    desc: 'What you’d need invested to live on withdrawals — and coast progress.',
    icon: Flame,
    accent: '#34d399',
  },
  {
    id: 'roth-conversion',
    name: 'Roth Conversion',
    desc: 'Tax cost today versus tax avoided later. Not a recommendation.',
    icon: ArrowLeftRight,
    accent: '#facc15',
  },
  {
    id: 'blind-budget',
    name: 'Blind Budget',
    desc: 'Plan honestly when exact numbers aren’t available yet.',
    icon: EyeOff,
    accent: '#facc15',
  },
]

/* Canon tier accents */
export const TIER_HEX = {
  protected: '#34d399',
  stretch: '#facc15',
  redLine: '#f24822',
  avalanche: '#22d3ee',
  snowball: '#fab633',
  p10: '#f24822',
  p50: '#22d3ee',
  p90: '#34d399',
} as const
