// Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.) on
// Vitest's expect. Safe to load in the node environment too — it only extends
// the matcher registry and pulls in no DOM at import time. Component tests that
// actually use these matchers run under jsdom via a per-file
// `// @vitest-environment jsdom` docblock.
import "@testing-library/jest-dom/vitest";
