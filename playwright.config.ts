import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
export const E2E_ADMIN_PASSWORD = "e2e-admin";

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
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
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
    },
  },
});
