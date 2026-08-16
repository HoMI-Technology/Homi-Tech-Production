import {
  Briefcase,
  CarFront,
  Clapperboard,
  HeartPulse,
  Home,
  Landmark,
  PiggyBank,
  Plane,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Tag,
  UtensilsCrossed,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Map of category icon keys (Category.icon) to lucide components. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Home,
  ShoppingCart,
  UtensilsCrossed,
  CarFront,
  Repeat,
  Plane,
  HeartPulse,
  ShoppingBag,
  Clapperboard,
  Briefcase,
  Landmark,
  PiggyBank,
  Tag,
}

export function categoryIcon(key: string): LucideIcon {
  return CATEGORY_ICONS[key] ?? Tag
}
