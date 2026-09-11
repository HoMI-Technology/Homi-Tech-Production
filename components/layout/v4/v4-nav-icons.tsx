import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  GitCompare,
  Home,
  Landmark,
  MoreHorizontal,
  Receipt,
  Route,
  Search,
  Settings,
  Shield,
  Wallet,
  Wrench,
} from "lucide-react";

/** Lucide is already in-tree — nav marks only. Never a second Compass. */
export const V4_NAV_ICONS: Record<string, LucideIcon> = {
  Home,
  Money: Wallet,
  Path: Route,
  Compare: GitCompare,
  "Ask HōMI": Search,
  Bills: Receipt,
  Tools: Wrench,
  Learn: BookOpen,
  Accounts: Landmark,
  Settings,
  Attention: Bell,
  Privacy: Shield,
  More: MoreHorizontal,
};
