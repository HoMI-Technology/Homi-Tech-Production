import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { BudgetProvider, ToastProvider } from '@/store/budget'
import { ReadinessProvider } from '@/store/readiness'
import { PartnerProvider } from '@/store/partner'
import Layout from '@/components/Layout'
import EventProbe from '@/components/EventProbe'

/* Route-level code splitting — performance budget: ≤300KB gzip initial. */
const Overview = lazy(() => import('@/pages/Overview'))
const Readiness = lazy(() => import('@/pages/Readiness'))
const BuildPath = lazy(() => import('@/pages/BuildPath'))
const Partner = lazy(() => import('@/pages/Partner'))
const Transactions = lazy(() => import('@/pages/Transactions'))
const Investments = lazy(() => import('@/pages/Investments'))
const Goals = lazy(() => import('@/pages/Goals'))
const Trust = lazy(() => import('@/pages/Trust'))
const Pricing = lazy(() => import('@/pages/Pricing'))
const Report = lazy(() => import('@/pages/Report'))
/* Canon port wave — GitHub is truth; these pages are byte-faithful adaptations. */
const Assessment = lazy(() => import('@/pages/Assessment'))
const ShadowScore = lazy(() => import('@/pages/ShadowScore'))
const Rehearse = lazy(() => import('@/pages/Rehearse'))
const Genome = lazy(() => import('@/pages/Genome'))
const Tools = lazy(() => import('@/pages/Tools'))
const Planner = lazy(() => import('@/pages/Planner'))

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-pulse rounded-full border-2 border-cyan/40 border-t-cyan" />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <BudgetProvider>
        <ReadinessProvider>
          <PartnerProvider>
            <EventProbe />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Overview />} />
                  <Route path="readiness" element={<Readiness />} />
                  <Route path="buildpath" element={<BuildPath />} />
                  <Route path="partner" element={<Partner />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="investments" element={<Investments />} />
                  <Route path="goals" element={<Goals />} />
                  <Route path="assessment" element={<Assessment />} />
                  <Route path="rehearse" element={<Rehearse />} />
                  <Route path="genome" element={<Genome />} />
                  <Route path="tools" element={<Tools />} />
                  <Route path="planner" element={<Planner />} />
                  <Route path="trust" element={<Trust />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="*" element={<Overview />} />
                </Route>
                {/* Shadow Score — standalone quick read, outside app chrome */}
                <Route path="shadow" element={<ShadowScore />} />
                {/* Standalone printable sheet — outside app chrome */}
                <Route path="report" element={<Report />} />
              </Routes>
            </Suspense>
          </PartnerProvider>
        </ReadinessProvider>
      </BudgetProvider>
    </ToastProvider>
  )
}
