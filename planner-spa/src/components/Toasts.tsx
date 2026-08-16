import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, Trash2, X } from 'lucide-react'
import { useToast } from '@/store/budget'
import type { ToastKind } from '@/store/budget'

const KIND_STYLE: Record<ToastKind, { bar: string; icon: typeof Info; iconColor: string; action: string }> = {
  success: { bar: '#34d399', icon: CheckCircle2, iconColor: 'text-emerald', action: 'text-cyan hover:text-cyan-300' },
  delete: { bar: '#f24822', icon: Trash2, iconColor: 'text-crimson', action: 'text-cyan hover:text-cyan-300' },
  info: { bar: '#22d3ee', icon: Info, iconColor: 'text-cyan', action: 'text-cyan hover:text-cyan-300' },
}

/** Bottom-right toast stack (max 3). Renders the global toast context. */
export default function Toasts() {
  const { toasts, dismissToast } = useToast()
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[340px] max-w-[calc(100vw-40px)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const style = KIND_STYLE[t.kind]
          const Icon = style.icon
          return (
            <motion.div
              key={t.id}
              layout="position"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="pointer-events-auto relative overflow-hidden rounded-xl border border-white/[0.1] bg-navyLight/95 px-4 py-3 shadow-xl backdrop-blur"
            >
              <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: style.bar }} />
              <div className="flex items-start gap-3 pl-1">
                <Icon size={16} className={`mt-0.5 shrink-0 ${style.iconColor}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-light">{t.message}</p>
                  {t.description && <p className="mt-0.5 truncate text-xs text-dim">{t.description}</p>}
                </div>
                {t.actionLabel && (
                  <button
                    onClick={() => {
                      t.onAction?.()
                      dismissToast(t.id)
                    }}
                    className={`shrink-0 text-[13px] font-semibold ${style.action}`}
                  >
                    {t.actionLabel}
                  </button>
                )}
                <button
                  onClick={() => dismissToast(t.id)}
                  className="shrink-0 rounded-md p-0.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
