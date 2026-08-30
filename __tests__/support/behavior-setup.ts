/**
 * Behavior-project setup. jest-dom is already registered in vitest.setup.ts.
 * This file only installs the shared matchMedia stub when window exists.
 */
import { stubMatchMedia } from "./match-media";

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: stubMatchMedia({ reducedMotion: false }),
  });
}
