import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import i18next from "eslint-plugin-i18next";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{tsx,jsx}"],
    ignores: ["src/**/*.test.{tsx,jsx}", "src/test/**"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": ["error", {
        mode: "jsx-only",
        "jsx-attributes": {
          exclude: ["className", "styleName", "style", "type", "key", "id", "width", "height", "name", "value", "data-.*", "aria-pressed"],
        },
      }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);
