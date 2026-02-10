import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**",
  ]),
  // Custom rules
  {
    rules: {
      // Disable overly strict rule - legitimate use cases exist for resetting state when props change
      "react-hooks/set-state-in-effect": "off",
      // Allow explicit any in specific cases (e.g., type assertions)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    },
    settings: {
      react: {
        version: "19.0",
      },
    },
  },
]);

export default eslintConfig;
