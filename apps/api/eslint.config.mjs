import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@portal-inmobiliario/web", "@portal-inmobiliario/web/*", "**/web/src/**"],
          message: "O backend deve ser independente do frontend; compartilhe somente contratos públicos.",
        }],
      }],
    },
  },
  // Sobrescreve a lista padrão de arquivos ignorados do eslint-config-next.
  globalIgnores([
    // Arquivos ignorados por padrão pelo eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/prisma/**",
  ]),
]);

export default eslintConfig;
