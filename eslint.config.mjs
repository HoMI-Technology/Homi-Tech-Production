import { dirname } from "path";
import { fileURLToPath } from "url";

import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import eslintConfigNext from "eslint-config-next";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default tseslint.config(
  // Base JS/TS recommended rules
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,

  // Next.js core-web-vitals (includes React + React Hooks rules)
  ...compat.extends("next/core-web-vitals"),

  // React flat-config settings (jsx-runtime for React 17+)
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"],
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // Already handled by Next.js / core-web-vitals
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // Hooks rules are already included by core-web-vitals, but we
      // re-declare to be explicit in case the compat layer shifts.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Strict TypeScript rules that catch real bugs without being noisy
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",

      // Disabled: too noisy on an existing Next.js + React codebase
      // "@typescript-eslint/no-misused-promises" would require massive
      // callback re-typing for event handlers throughout the app.
      "@typescript-eslint/no-misused-promises": "off",

      // Disabled: strict TypeScript already enforces this at compile time;
      // the ESLint rule duplicates compiler noise on well-typed code.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",

      // Disabled: existing Next.js patterns use require() in configs/scripts
      "@typescript-eslint/no-require-imports": "off",

      // Console warnings only (not errors) — logs are sometimes intentional
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Ignore patterns
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "*.min.js",
      "public/**",
    ],
  },
);
