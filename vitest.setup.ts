// Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.) on
// Vitest's expect. Safe to load in the node environment too — it only extends
// the matcher registry and pulls in no DOM at import time. Component tests that
// actually use these matchers run under jsdom via a per-file
// `// @vitest-environment jsdom` docblock.
import "@testing-library/jest-dom/vitest";

// Vitest 4.x + jsdom on Node 26 leaves `window.localStorage` undefined
// (sessionStorage is present). Polyfill it with an in-memory Storage so tests
// that call localStorage.clear()/getItem()/setItem() keep working.
if (typeof window !== "undefined" && !window.localStorage) {
  class MockStorage implements Storage {
    private store = new Map<string, string>();
    get length() {
      return this.store.size;
    }
    key(index: number) {
      return Array.from(this.store.keys())[index] ?? null;
    }
    getItem(key: string) {
      return this.store.get(key) ?? null;
    }
    setItem(key: string, value: string) {
      this.store.set(key, String(value));
    }
    removeItem(key: string) {
      this.store.delete(key);
    }
    clear() {
      this.store.clear();
    }
  }
  Object.defineProperty(window, "localStorage", {
    value: new MockStorage(),
    writable: true,
    configurable: true,
  });
}
