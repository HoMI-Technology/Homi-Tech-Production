/**
 * HōMI Keyboard Shortcuts — centralized shortcut definitions.
 * Scopes: global (always active), assessment (only during assessment),
 * dashboard (only on dashboard pages).
 *
 * Uses CustomEvent for decoupled communication with assessment flow.
 */

export type ShortcutScope = "global" | "assessment" | "dashboard";

export interface ShortcutDef {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  scope: ShortcutScope;
  description: string;
  action: () => void;
}

/** Global shortcuts — active everywhere. */
const GLOBAL_SHORTCUTS: ShortcutDef[] = [
  {
    key: "?",
    scope: "global",
    description: "Show / hide keyboard shortcuts",
    action: () => {
      window.dispatchEvent(new CustomEvent("homi:toggle-shortcuts"));
    },
  },
  {
    key: "Escape",
    scope: "global",
    description: "Close overlays (shortcuts, banners, modals)",
    action: () => {
      window.dispatchEvent(new CustomEvent("homi:close-overlays"));
    },
  },
  {
    key: "j",
    scope: "global",
    description: "Open decision journal",
    action: () => {
      window.location.href = "/journal";
    },
  },
  {
    key: "d",
    scope: "global",
    description: "Go to dashboard",
    action: () => {
      window.location.href = "/dashboard";
    },
  },
  {
    key: "a",
    scope: "global",
    description: "Start assessment",
    action: () => {
      window.location.href = "/assessment";
    },
  },
  {
    key: "t",
    scope: "global",
    description: "Open Money",
    action: () => {
      window.location.href = "/money";
    },
  },
  {
    key: "1",
    ctrl: true,
    scope: "global",
    description: "Go to Money · Decide",
    action: () => {
      window.location.href = "/money/decide";
    },
  },
  {
    key: "2",
    ctrl: true,
    scope: "global",
    description: "Go to assessment",
    action: () => {
      window.location.href = "/assessment";
    },
  },
  {
    key: "3",
    ctrl: true,
    scope: "global",
    description: "Go to dashboard",
    action: () => {
      window.location.href = "/dashboard";
    },
  },
];

/** Assessment-only shortcuts — active during full assessment flow. */
const ASSESSMENT_SHORTCUTS: ShortcutDef[] = [
  {
    key: "ArrowRight",
    scope: "assessment",
    description: "Next question",
    action: () => {
      window.dispatchEvent(new CustomEvent("homi:next-question"));
    },
  },
  {
    key: "ArrowLeft",
    scope: "assessment",
    description: "Previous question",
    action: () => {
      window.dispatchEvent(new CustomEvent("homi:prev-question"));
    },
  },
  {
    key: "1",
    scope: "assessment",
    description: "Select option 1",
    action: () => {
      window.dispatchEvent(new CustomEvent("homi:select-option", { detail: { index: 0 } }));
    },
  },
  {
    key: "2",
    scope: "assessment",
    description: "Select option 2",
    action: () => {
      window.dispatchEvent(new CustomEvent("homi:select-option", { detail: { index: 1 } }));
    },
  },
  {
    key: "3",
    scope: "assessment",
    description: "Select option 3",
    action: () => {
      window.dispatchEvent(new CustomEvent("homi:select-option", { detail: { index: 2 } }));
    },
  },
  {
    key: "4",
    scope: "assessment",
    description: "Select option 4",
    action: () => {
      window.dispatchEvent(new CustomEvent("homi:select-option", { detail: { index: 3 } }));
    },
  },
  {
    key: "Enter",
    scope: "assessment",
    description: "Confirm selection / Continue",
    action: () => {
      window.dispatchEvent(new CustomEvent("homi:confirm-selection"));
    },
  },
];

/** Dashboard-only shortcuts. */
const DASHBOARD_SHORTCUTS: ShortcutDef[] = [
  {
    key: "r",
    scope: "dashboard",
    description: "Retake assessment",
    action: () => {
      window.location.href = "/assessment";
    },
  },
  {
    key: "c",
    scope: "dashboard",
    description: "Daily check-in",
    action: () => {
      window.location.href = "/daily";
    },
  },
];

export const ALL_SHORTCUTS: ShortcutDef[] = [
  ...GLOBAL_SHORTCUTS,
  ...ASSESSMENT_SHORTCUTS,
  ...DASHBOARD_SHORTCUTS,
];

/** Get shortcuts filtered by scope (includes global in every scope). */
export function getShortcutsForScope(scope: ShortcutScope): ShortcutDef[] {
  return ALL_SHORTCUTS.filter((s) => s.scope === "global" || s.scope === scope);
}

/** Format a shortcut for display (e.g., "Ctrl + J"). */
export function formatShortcut(shortcut: ShortcutDef): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");
  parts.push(shortcut.key);
  return parts.join(" + ");
}
