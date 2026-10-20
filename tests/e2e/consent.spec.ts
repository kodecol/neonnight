import { expect, test, type Page } from "@playwright/test";
import { E2E_GA_ID, E2E_PIXEL_ID } from "../../playwright.config";

// Sin elección previa: el banner debe aparecer.
test.use({ storageState: { cookies: [], origins: [] } });

/** Intercepta Google y Meta (nunca salimos a internet) y cuenta las peticiones. */
async function watchTrackers(page: Page) {
  const hits = { ga: 0, meta: 0 };
  await page.route("https://www.googletagmanager.com/**", (r) => {
    hits.ga++;
    return r.fulfill({ status: 200, contentType: "text/javascript", body: "" });
  });
  await page.route("https://connect.facebook.net/**", (r) => {
    hits.meta++;
    return r.fulfill({ status: 200, contentType: "text/javascript", body: "" });
  });
  return hits;
}

test.describe("Consentimiento de cookies", () => {
  test("nada de Google ni Meta se carga antes de aceptar", async ({ page }) => {
    const hits = await watchTrackers(page);
    await page.goto("/");
    const banner = page.getByTestId("consent-banner");
    await expect(banner).toBeVisible();
    await expect(page.getByTestId("whatsapp-fab")).toBeHidden();
    await page.waitForTimeout(500);
    expect(hits).toEqual({ ga: 0, meta: 0 });

    await page.getByTestId("consent-accept").click();
    await expect(banner).toBeHidden();
    await expect.poll(() => hits.ga).toBeGreaterThan(0);
    await expect.poll(() => hits.meta).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.querySelector(`script[src*="gtag/js"]`)?.getAttribute("src"))).toContain(E2E_GA_ID);
    expect(await page.evaluate(() => (window as unknown as { fbq?: { queue?: unknown[][] } }).fbq?.queue?.some((c) => c[0] === "init"))).toBe(true);
    expect(E2E_PIXEL_ID).toMatch(/^\d+$/);

    // La elección se recuerda.
    await page.reload();
    await expect(page.getByTestId("consent-banner")).toBeHidden();
  });

  test("rechazar no carga nada y se puede cambiar desde el pie de página", async ({ page }) => {
    const hits = await watchTrackers(page);
    await page.goto("/");
    await page.getByTestId("consent-reject").click();
    await expect(page.getByTestId("consent-banner")).toBeHidden();
    await page.waitForTimeout(500);
    expect(hits).toEqual({ ga: 0, meta: 0 });

    await page.getByTestId("cookie-settings").click();
    await expect(page.getByTestId("consent-banner")).toBeVisible();
    await page.getByTestId("consent-analytics").check();
    await page.getByTestId("consent-save").click();
    await expect.poll(() => hits.ga).toBeGreaterThan(0);
    expect(hits.meta).toBe(0);
  });
});
