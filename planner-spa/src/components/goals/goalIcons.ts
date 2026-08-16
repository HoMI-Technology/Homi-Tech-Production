import { Car, Gem, GraduationCap, Heart, Home, Plane, Rocket, Shield, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Goal } from '@/store/budget'

/**
 * Goal icon persistence. The shared Goal type has no icon field, so icon picks
 * live in their own localStorage slot keyed by goal id (store is untouched).
 */

export const GOAL_ICON_OPTIONS = [
  'Home',
  'Shield',
  'Plane',
  'Car',
  'GraduationCap',
  'Gem',
  'Heart',
  'Rocket',
] as const

export type GoalIconKey = (typeof GOAL_ICON_OPTIONS)[number]

export const GOAL_ICONS: Record<GoalIconKey, LucideIcon> = {
  Home,
  Shield,
  Plane,
  Car,
  GraduationCap,
  Gem,
  Heart,
  Rocket,
}

const ICON_STORAGE_KEY = 'homi-goal-icons-v1'

function loadMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(ICON_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function saveGoalIcon(goalId: string, key: GoalIconKey): void {
  if (typeof window === 'undefined') return
  try {
    const map = loadMap()
    map[goalId] = key
    window.localStorage.setItem(ICON_STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* storage unavailable — icon stays session-only */
  }
}

/** Keyword-based default when the user never picked an icon. */
export function inferGoalIconKey(name: string): GoalIconKey | null {
  const n = name.toLowerCase()
  if (/house|home|down payment|mortgage/.test(n)) return 'Home'
  if (/emergency|safety|shield|cushion/.test(n)) return 'Shield'
  if (/trip|travel|vacation|japan|flight/.test(n)) return 'Plane'
  if (/car|auto|vehicle|truck/.test(n)) return 'Car'
  if (/school|college|education|tuition|degree/.test(n)) return 'GraduationCap'
  if (/ring|wedding|gem|jewel/.test(n)) return 'Gem'
  if (/health|heart|medical|baby|family/.test(n)) return 'Heart'
  if (/rocket|startup|business|launch/.test(n)) return 'Rocket'
  return null
}

export function goalIconKeyFor(goal: Goal): GoalIconKey | null {
  const saved = loadMap()[goal.id]
  if (saved && (GOAL_ICON_OPTIONS as readonly string[]).includes(saved)) return saved as GoalIconKey
  return inferGoalIconKey(goal.name)
}

export function goalIconFor(goal: Goal): LucideIcon {
  const key = goalIconKeyFor(goal)
  return key ? GOAL_ICONS[key] : Target
}
