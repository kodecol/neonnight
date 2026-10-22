import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { renderIcon } from "@/app/_icons/render";
import { isotypeBytes } from "@/app/_og/brand";
import type { BrandAssets } from "@/application/use-cases/brand-assets";

const brand = (isotype: BrandAssets["isotype"]): BrandAssets => ({
  version: "v1",
  factoryIcons: false,
  iconsDir: null,
  name: "Casa Prueba",
  shortName: "Casa Prueba",
  description: "Tienda de prueba.",
  locale: "es_CO",
  isotype,
  bg: "#112233",
});

describe("Íconos con un isotipo que sharp no puede leer", () => {
  // Identidad acepta cualquier /assets/…: un video publicado como isotipo daba 500 en /favicon.ico y /icons/*.
  const video = brand({ src: "/assets/hero-day-date.mp4", alt: "", ratio: 1 });

  it("vuelven al isotipo del sitio en vez de fallar", async () => {
    const png = await renderIcon(video, "icon-192.png");
    expect(await sharp(png).metadata()).toMatchObject({ format: "png", width: 192, height: 192 });
    const ico = await renderIcon(video, "favicon.ico");
    expect([...ico.subarray(0, 4)]).toEqual([0, 0, 1, 0]);
    // Igual que sin isotipo propio.
    expect(Buffer.compare(png, await renderIcon(brand(null), "icon-192.png"))).toBe(0);
  });
});

describe("isotypeBytes: solo archivos de public/assets/", () => {
  it("una carpeta hermana que empieza por «assets» no cuenta", async () => {
    const dir = await mkdtemp(join(process.cwd(), "public", "assets-"));
    try {
      await writeFile(join(dir, "secreto.png"), "no debería leerse");
      expect(await isotypeBytes(`/${basename(dir)}/secreto.png`)).toBeNull();
      expect(await isotypeBytes("/assets/../fonts/og/archivo-200.woff")).toBeNull();
      expect(await isotypeBytes("/assets/isotipo-dark.png")).not.toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
