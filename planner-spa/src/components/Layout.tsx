import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from '@/components/Sidebar'
import TopBar, { TopBarExtrasProvider } from '@/components/TopBar'
import Toasts from '@/components/Toasts'
import { TransactionModalProvider } from '@/components/TransactionModal'

/**
 * App shell: fixed sidebar + sticky top bar + routed content slot.
 * Owns the mobile drawer (under 768px) and the global add/edit modal context.
 */
export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  return (
    <TransactionModalProvider>
      <TopBarExtrasProvider>
        <div className="min-h-[100dvh] bg-navy text-light">
          {/* page background: cyan aurora + noise overlay */}
          <div aria-hidden className="app-aurora pointer-events-none fixed inset-0 z-0" />
          <div aria-hidden className="app-noise pointer-events-none fixed inset-0 z-0" />

          <Sidebar />

          {/* mobile drawer */}
          <AnimatePresence>
            {drawerOpen && (
              <motion.div
                key="drawer-underlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-navyLight/70 backdrop-blur-sm md:hidden"
                onClick={() => setDrawerOpen(false)}
              >
                <motion.div
                  key="drawer-panel"
                  initial={{ x: -264 }}
                  animate={{ x: 0 }}
                  exit={{ x: -264 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 34 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Sidebar mode="drawer" onNavigate={() => setDrawerOpen(false)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 md:pl-[72px] xl:pl-[248px]">
            <TopBar onMenu={() => setDrawerOpen(true)} />
            <main className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut', delay: 0.05 } }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>

          <Toasts />
        </div>
      </TopBarExtrasProvider>
    </TransactionModalProvider>
  )
}
