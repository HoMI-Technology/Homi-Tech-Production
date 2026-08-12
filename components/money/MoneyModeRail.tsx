/**
 * @deprecated The vertical S/T/D/P rail is gone — the money surface is a
 * single-column cockpit with labeled horizontal tabs. This module is a
 * compatibility shim for lingering imports and will be deleted; import
 * `MoneyModeNav` from "@/components/money/MoneyModeNav" instead.
 */
export {
  MoneyModeNav as MoneyModeRail,
  MONEY_MODES,
  modeFromPath,
} from "@/components/money/MoneyModeNav";
export type { MoneyMode } from "@/components/money/MoneyModeNav";
