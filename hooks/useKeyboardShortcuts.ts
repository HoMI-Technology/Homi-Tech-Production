"use client";

import { useEffect } from "react";
import {
  getShortcutsForScope,
  type ShortcutDef,
  type ShortcutScope,
} from "@/lib/keyboard/shortcuts";

interface UseKeyboardShortcutsOptions {
  scope: ShortcutScope;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutDef): boolean {
  if (event.key !== shortcut.key) return false;
  const wantsCtrl = Boolean(shortcut.ctrl);
  const hasCtrl = event.ctrlKey || event.metaKey;
  if (wantsCtrl !== hasCtrl) return false;
  if (Boolean(shortcut.alt) !== event.altKey) return false;
  if (Boolean(shortcut.shift) !== event.shiftKey) return false;
  return true;
}

/** Registers keyboard shortcuts for the given scope (includes global shortcuts). */
export function useKeyboardShortcuts({ scope }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const shortcuts = getShortcutsForScope(scope);

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      for (const shortcut of shortcuts) {
        if (!matchesShortcut(event, shortcut)) continue;
        event.preventDefault();
        shortcut.action();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scope]);
}
