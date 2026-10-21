import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

// Publica una apariencia: corre en el proyecto "inicio" y deja la de fábrica.
test.describe.configure({ mode: "serial" });

const href = (page: Page, sel: string) => page.locator(sel).first().getAttribute("href");

async function png(request: APIRequestContext, url: string) {
  const res = await request.get(url);
  expect(res.status(), url).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  const img = sharp(await res.body());
  const { width, height } = await img.metadata();
  const corner = [...(await img.extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer())];
  return { width, height, corner, cache: res.headers()["cache-control"] };
}

async function publishPreset(page: Page, testId: string) {
  await page.goto("/admin/ajustes/apariencia");
  await page.getByTestId(testId).click();
  await page.getByTestId("appearance-publish").click();
  await expect(page.getByText("Publicada en la tienda")).toBeVisible();
}

test.describe("Favicon, íconos y manifest", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#password", E2E_ADMIN_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin\/catalogo$/);
  });

  test("siguen la apariencia publicada y cambian de URL al publicar", async ({ page, request }) => {
    await publishPreset(page, "preset-zafiro");
    await page.goto("/");
    const manifestUrl = await href(page, 'link[rel="manifest"]');
    const appleUrl = await href(page, 'link[rel="apple-touch-icon"]');
    const ogUrl = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(manifestUrl).toMatch(/^\/manifest\.webmanifest\?v=\w+$/);
    expect(appleUrl).toMatch(/^\/icons\/apple-touch-icon\.png\?v=\w+$/);
    expect(ogUrl).toMatch(/\/og\/inicio\.jpg\?v=\w+$/);

    const res = await request.get(manifestUrl!);
    expect(res.headers()["content-type"]).toContain("application/manifest+json");
    expect(res.headers()["cache-control"]).toContain("immutable");
    const manifest = await res.json();
    expect(manifest).toMatchObject({ start_url: "/", display: "standalone", theme_color: "#05070d", background_color: "#05070d" });
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.icons.map((i: { purpose: string }) => i.purpose)).toEqual(["any", "any", "maskable"]);

    // Cada ícono del manifest con su tamaño y el fondo del tema.
    for (const icon of manifest.icons as Array<{ src: string; sizes: string }>) {
      const img = await png(request, icon.src);
      expect(`${img.width}x${img.height}`).toBe(icon.sizes);
      expect(img.corner).toEqual([5, 7, 13]);
      expect(img.cache).toContain("immutable");
    }
    const apple = await png(request, appleUrl!);
    expect([apple.width, apple.corner]).toEqual([180, [5, 7, 13]]);

    // El favicon: un .ico con 16, 32 y 48 px.
    const ico = await request.get("/favicon.ico");
    expect(ico.headers()["content-type"]).toBe("image/x-icon");
    const bytes = await ico.body();
    expect([bytes.readUInt16LE(2), bytes.readUInt16LE(4), bytes[6], bytes[22], bytes[38]]).toEqual([1, 3, 16, 32, 48]);
    expect((await request.get("/icons/otro.png")).status()).toBe(404);

    // De vuelta a fábrica: otra versión en las URLs y los archivos del sitio tal cual.
    await publishPreset(page, "appearance-factory");
    await page.goto("/");
    expect(await href(page, 'link[rel="manifest"]')).not.toBe(manifestUrl);
    const factory = await request.get((await href(page, 'link[rel="apple-touch-icon"]'))!);
    expect(Buffer.compare(await factory.body(), await readFile("public/assets/icons/apple-touch-icon.png"))).toBe(0);
    expect(Buffer.compare(await (await request.get("/favicon.ico")).body(), await readFile("public/assets/icons/favicon.ico"))).toBe(0);
    expect((await (await request.get("/manifest.webmanifest")).json()).theme_color).toBe("#000000");
  });

  test("con un isotipo propio, el ícono lo usa; quitarlo vuelve al del sitio", async ({ page, request }) => {
    // Un círculo rojo sobre transparente.
    const circle = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="90" fill="#ff0000"/></svg>');
    const art = await sharp(circle).png().toBuffer();
    await page.goto("/admin/ajustes/identidad");
    await page.getByTestId("identity-isotype").locator('input[type="file"]').setInputFiles({ name: "iso.png", mimeType: "image/png", buffer: art });
    await expect(page.getByRole("button", { name: "Reemplazar isotipo" })).toBeVisible();
    await page.getByTestId("identity-publish").click();
    await expect(page.getByText("Publicado en la tienda")).toBeVisible();

    await page.goto("/");
    const icon = await request.get((await href(page, 'link[rel="icon"][sizes="512x512"]'))!);
    const img = sharp(await icon.body());
    const center = [...(await img.clone().extract({ left: 256, top: 256, width: 1, height: 1 }).removeAlpha().raw().toBuffer())];
    const corner = [...(await img.clone().extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer())];
    expect([center, corner]).toEqual([
      [255, 0, 0],
      [0, 0, 0],
    ]);

    // La vista previa al compartir también usa el isotipo subido (aunque no esté en Cloudinary).
    const og = await request.get((await page.locator('meta[property="og:image"]').getAttribute("content"))!);
    const [r = 0, g = 255, b = 255] = [...(await sharp(await og.body()).extract({ left: 101, top: 93, width: 1, height: 1 }).raw().toBuffer())];
    expect(r).toBeGreaterThan(200);
    expect(g + b).toBeLessThan(80);

    await page.goto("/admin/ajustes/identidad");
    await page.getByTestId("identity-factory").click();
    await page.getByTestId("identity-publish").click();
    await expect(page.getByText("Publicado en la tienda")).toBeVisible();
    expect(Buffer.compare(await (await request.get("/favicon.ico")).body(), await readFile("public/assets/icons/favicon.ico"))).toBe(0);
  });
});
