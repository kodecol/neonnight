import { defineConfig, devices } from "@playwright/test";

// E2E_PORT permite correr dos copias del repo a la vez (worktrees) sin chocar.
const PORT = Number(process.env.E2E_PORT) || 3100;
const baseURL = `http://localhost:${PORT}`;
export const E2E_ADMIN_PASSWORD = "e2e-admin";
/** IDs de prueba: activan el banner de cookies; las peticiones a Google y Meta se interceptan en los tests. */
export const E2E_GA_ID = "G-E2ETEST01";
export const E2E_PIXEL_ID = "100000000000001";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
    // Elección de cookies ya hecha (rechazo): el banner no tapa nada. consent.spec.ts parte de cero.
    storageState: {
      cookies: [],
      origins: [{ origin: baseURL, localStorage: [{ name: "neonnight.consent.v1", value: JSON.stringify({ analytics: false, marketing: false, at: new Date().toISOString() }) }] }],
    },
  },
  projects: [
    { name: "chromium", testIgnore: /(home|orders|legal|brands)-admin\.spec/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    // Cambian estado compartido (home, pedidos, legales, marquee): corren al final, un proyecto tras otro.
    { name: "inicio", testMatch: /(home|orders|legal)-admin\.spec/, dependencies: ["chromium"], use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "marcas", testMatch: /brands-admin\.spec/, dependencies: ["inicio"], use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      SITE_URL: baseURL, // runtime: misma imagen para cualquier dominio
      WHATSAPP_NUMBER: "573000000000",
      // Vacías a propósito: ganan sobre .env.local → repositorios en memoria y fotos en disco, datos deterministas.
      MONGODB_URI: "",
      CLOUDINARY_URL: "",
      ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
      ADMIN_SECRET: "e2e-secret-e2e-secret-e2e-secret-0000",
      GA_MEASUREMENT_ID: E2E_GA_ID,
      META_PIXEL_ID: E2E_PIXEL_ID,
    },
  },
});
