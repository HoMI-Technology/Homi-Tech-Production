"use client";

/* ------------------------------------------------------------------ */
/* WealthCommand — Wealth tab (planner spec §6).                        */
/*                                                                      */
/* Composes the three wealth panels: BrokerPanel (brokerage feeds),     */
/* PortfolioPanel (holdings + allocation), NetWorthPanel (assets vs     */
/* liabilities + runway/DTI). No required props — each panel reads      */
/* usePlannerStore directly.                                            */
/* ------------------------------------------------------------------ */

import BrokerPanel from './BrokerPanel'
import NetWorthPanel from './NetWorthPanel'
import PortfolioPanel from './PortfolioPanel'

export function WealthCommand() {
  return (
    <div className="flex flex-col gap-5">
      <BrokerPanel />
      <PortfolioPanel />
      <NetWorthPanel />
    </div>
  )
}

export default WealthCommand
