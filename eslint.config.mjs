import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// Errors are reserved for rules that point at real bugs. Style rules and the
// React Compiler rules that this code base predates are warnings, so
// `npm run lint` passes today and the warning count can be worked down.
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.expo/**",
      "apps/mobile/android/**",
      "apps/mobile/ios/**",
      "apps/mobile/static-build/**",
      "apps/web/public/**",
      "docs/**",
      ".local-pg/**",
      ".local-s3/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
      "@typescript-eslint/no-this-alias": "warn",
      "preserve-caught-error": "warn",
      "no-useless-assignment": "warn",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
      "no-regex-spaces": "warn",
      // Arabic diacritics are combining marks; character classes of them are intentional.
      "no-misleading-character-class": "warn",
    },
  },
  {
    // TypeScript already reports undefined names, with type information.
    files: ["**/*.{ts,tsx}"],
    rules: { "no-undef": "off" },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "apps/staff-preview/**/*.{ts,tsx}", "apps/mobile/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
  {
    // React Native loads images and fonts with require().
    files: ["apps/mobile/**/*.{ts,tsx,js}", "**/*.config.{js,cjs}", "**/babel.config.js", "**/metro.config.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["**/*-worklet.js"],
    languageOptions: { globals: { ...globals.audioWorklet } },
  },
);
