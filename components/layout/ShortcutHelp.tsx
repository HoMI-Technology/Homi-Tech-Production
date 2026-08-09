"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollLock } from "@/hooks/useScrollLock";
import { getShortcutsForScope, formatShortcut, type ShortcutScope } from "@/lib/keyboard/shortcuts";

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<ShortcutScope>("global");
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const handleToggle = () => setOpen((prev) => !prev);
    const handleClose = () => setOpen(false);
    const handleScopeChange = (e: Event) => {
      const custom = e as CustomEvent<{ scope: ShortcutScope }>;
      setScope(custom.detail.scope);
    };

    window.addEventListener("homi:toggle-shortcuts", handleToggle);
    window.addEventListener("homi:close-overlays", handleClose);
    window.addEventListener("homi:shortcut-scope", handleScopeChange);

    return () => {
      window.removeEventListener("homi:toggle-shortcuts", handleToggle);
      window.removeEventListener("homi:close-overlays", handleClose);
      window.removeEventListener("homi:shortcut-scope", handleScopeChange);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Shared y-only body scroll lock (task 3.5) — replaces the local
  // overflow:hidden toggle, which also killed position:sticky pin stages.
  useScrollLock(open);

  const shortcuts = getShortcutsForScope(scope);
  const globalShortcuts = shortcuts.filter((s) => s.scope === "global");
  const scopedShortcuts = shortcuts.filter((s) => s.scope !== "global");

  // Client-only portal to document.body (task 3.5): escapes the
  // ClientProviders page-transition wrapper, whose transient
  // will-change:transform turns it into the containing block for fixed
  // descendants. `open` is client-state-driven, so SSR renders nothing.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? {} : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-navy/80 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            initial={reducedMotion ? {} : { opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? {} : { opacity: 0, scale: 0.96, y: 10 }}
            transition={reducedMotion ? {} : { type: "spring", stiffness: 400, damping: 30 }}
            className="glass panel-focus relative w-full max-w-lg overflow-hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-high/30 px-6 py-4">
              <div>
                <p className="eyebrow">Keyboard shortcuts</p>
                <p className="mt-1 text-sm text-dim">
                  Press{" "}
                  <kbd className="rounded bg-slate-surface px-1.5 py-0.5 text-xs text-light">?</kbd>{" "}
                  anytime to toggle
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-dim transition-colors hover:text-light"
                aria-label="Close shortcuts"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M2 2l12 12M14 2L2 14" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan">
                Global
              </p>
              <div className="space-y-2">
                {globalShortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-slate-surface/50"
                  >
                    <span className="text-sm text-light">{shortcut.description}</span>
                    <kbd className="shrink-0 rounded-md border border-slate-high/50 bg-slate-surface px-2 py-1 font-mono text-xs text-dim">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            {scopedShortcuts.length > 0 && (
              <div className="border-t border-slate-high/30 px-6 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald">
                  {scope === "assessment" ? "Assessment" : "Dashboard"}
                </p>
                <div className="space-y-2">
                  {scopedShortcuts.map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-slate-surface/50"
                    >
                      <span className="text-sm text-light">{shortcut.description}</span>
                      <kbd className="shrink-0 rounded-md border border-slate-high/50 bg-slate-surface px-2 py-1 font-mono text-xs text-dim">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-high/30 px-6 py-3">
              <p className="text-xs text-dim/60">
                Shortcuts are disabled when typing in inputs or text areas.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
