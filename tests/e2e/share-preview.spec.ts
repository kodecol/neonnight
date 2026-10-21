import { expect, test } from "@playwright/test";

/** Vista previa al compartir (WhatsApp, Facebook, X): metas completas e imagen con longitud fija. */
const PAGES = [
  ["/", /\/og\/inicio\.jpg$/],
  ["/coleccion", /\/og\/inicio\.jpg$/],
  ["/coleccion/relojeria", /\/og\/linea\/relojeria\.jpg$/],
  ["/reloj/rolex-sky-dweller-326938", /\/og\/producto\/rolex-sky-dweller-326938\.jpg$/],
] as const;

for (const [path, image] of PAGES) {
  test(`${path}: og:* y twitter:* con la misma imagen JPEG servida con Content-Length`, async ({ page, request }) => {
    await page.goto(path);
    const meta = (sel: string) => page.locator(sel).first().getAttribute("content");
    const og = await meta('meta[property="og:image"]');
    expect(og).toMatch(image);
    expect(og).toMatch(/^https?:\/\//);
    expect(await meta('meta[property="og:image:secure_url"]')).toBe(og);
    expect(await meta('meta[property="og:image:width"]')).toBe("1200");
    expect(await meta('meta[property="og:image:height"]')).toBe("630");
    expect(await meta('meta[property="og:image:type"]')).toBe("image/jpeg");
    expect(await meta('meta[property="og:image:alt"]')).toBeTruthy();
    expect(await meta('meta[property="og:site_name"]')).toBe("Tu tienda");
    expect(await meta('meta[property="og:locale"]')).toBe("es_CO");
    expect(await meta('meta[name="twitter:card"]')).toBe("summary_large_image");
    expect(await meta('meta[name="twitter:image"]')).toBe(og);
    // Una sola og:image: la de la página (sin la genérica del layout).
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

    const res = await request.get(new URL(og!).pathname);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/jpeg");
    const length = Number(res.headers()["content-length"]);
    expect(length).toBeGreaterThan(5_000);
    expect(length).toBeLessThan(300_000);
    expect((await res.body()).byteLength).toBe(length);
  });
}

test("producto: precio para Facebook y Pinterest", async ({ page }) => {
  await page.goto("/reloj/rolex-sky-dweller-326938");
  await expect(page.locator('meta[name="product:price:currency"], meta[property="product:price:currency"]').first()).toHaveAttribute("content", "COP");
});
