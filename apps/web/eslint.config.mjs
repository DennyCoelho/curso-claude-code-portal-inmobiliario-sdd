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
          group: ["@prisma/*", "pg", "pg/*", "@portal-inmobiliario/api", "@portal-inmobiliario/api/*", "**/api/src/**", "**/generated/prisma/**", "@/services/**", "@/repositories/**", "@/lib/db", "@/lib/db/**"],
          message: "O frontend deve acessar o backend por HTTP e compartilhar somente contratos públicos.",
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
  ]),
]);

export default eslintConfig;
