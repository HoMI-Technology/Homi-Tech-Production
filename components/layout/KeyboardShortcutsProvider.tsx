"use client";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ShortcutHelp } from "./ShortcutHelp";

export function KeyboardShortcutsProvider() {
  useKeyboardShortcuts({ scope: "global" });
  return <ShortcutHelp />;
}
