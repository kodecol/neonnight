import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = ["/", "/coleccion", "/reloj/rolex-day-date-36"];

for (const path of PAGES) {
  test(`axe sin violaciones serias o críticas en ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForTimeout(2600); // deja terminar la pantalla de carga
    // Excepciones conocidas del diseño hi-fi (ver README "Accesibilidad"): el label blanco sobre el
    // magenta #FF006E (≈3.6:1) y el gris terciario #515151 sobre negro (≈2.4:1) vienen fijados por el
    // handoff. Se excluyen del chequeo automático hasta que diseño defina la alternativa.
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude(".bg-accent")
      .exclude(".text-ink-3")
      .analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html).slice(0, 3) })), null, 2)).toEqual([]);
  });
}

test("el contenido data-reveal es visible sin JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/");
  const first = page.locator("[data-reveal]").first();
  await expect(first).toBeVisible();
  const opacity = await first.evaluate((el) => getComputedStyle(el).opacity);
  expect(opacity).toBe("1");
  await expect(page.locator("[data-testid=loading-screen]")).toHaveCount(0);
  await ctx.close();
});

test("la pantalla de carga se desmonta del DOM y respeta reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("[data-testid=loading-screen]")).toHaveCount(0);
  await ctx.close();
});
