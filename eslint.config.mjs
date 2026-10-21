import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import boundaries from "eslint-plugin-boundaries";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * Capas de la clean architecture (ver docs/adr/0001-clean-architecture.md).
 * Las dependencias apuntan siempre hacia dentro: domain no importa nada;
 * application solo domain; infrastructure domain + application;
 * presentation domain + application (DTOs y puertos) — nunca infrastructure;
 * app (rutas Next) es el único lugar donde se toca el contenedor.
 */
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
      "docs/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*"],
      // El middleware de Next vive suelto en src/ (actúa como capa `app`: protege /admin).
      "boundaries/ignore": ["src/middleware.ts"],
      "boundaries/elements": [
        { type: "domain", pattern: "src/domain" },
        { type: "application", pattern: "src/application" },
        { type: "infrastructure", pattern: "src/infrastructure" },
        { type: "presentation", pattern: "src/presentation" },
        { type: "app", pattern: "src/app" },
        // CLI del ciclo de vida de la plantilla (lifecycle.mjs): compone como `app`, sin Next.
        { type: "cli", pattern: "src/cli" },
      ],
    },
    rules: {
      "boundaries/no-unknown-files": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            { from: { element: { type: "domain" } }, allow: { to: { element: { type: "domain" } } } },
            { from: { element: { type: "application" } }, allow: { to: { element: { types: { anyOf: ["domain", "application"] } } } } },
            { from: { element: { type: "infrastructure" } }, allow: { to: { element: { types: { anyOf: ["domain", "application", "infrastructure"] } } } } },
            { from: { element: { type: "presentation" } }, allow: { to: { element: { types: { anyOf: ["domain", "application", "presentation"] } } } } },
            { from: { element: { type: "app" } }, allow: { to: { element: { types: { anyOf: ["domain", "application", "infrastructure", "presentation", "app"] } } } } },
            { from: { element: { type: "cli" } }, allow: { to: { element: { types: { anyOf: ["domain", "application", "infrastructure", "cli"] } } } } },
          ],
        },
      ],
    },
  },
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react-*", "next", "next/*", "zod", "@/infrastructure/*", "@/presentation/*", "@/app/*"], message: "El dominio no depende de nada externo." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // El design system tiene radio 0 en todo. Prohibimos las utilidades rounded-* para que no se erosione.
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/(^|\\s)rounded(-[a-z0-9-]+)?(\\s|$)/]",
          message: "Radio 0 en todo el sistema: no uses utilidades rounded-*.",
        },
        {
          selector: "JSXAttribute[name.name='className'] TemplateElement[value.raw=/(^|\\s)rounded(-[a-z0-9-]+)?(\\s|$)/]",
          message: "Radio 0 en todo el sistema: no uses utilidades rounded-*.",
        },
      ],
    },
  },
];

export default eslintConfig;
