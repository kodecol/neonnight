import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ZodError } from "zod";
import { inspectSvg } from "@/application/lib/svg";
import { DeleteBrand, EnsureBrand, ListAdminBrands, ReorderBrands, SaveBrand, UploadBrandLogo } from "@/application/use-cases/admin/brands";
import { ListMarqueeBrands } from "@/application/use-cases/list-brands";
import { BrandInUseError } from "@/domain/errors";
import { brandKey } from "@/domain/entities/brand";
import { InMemoryBrandRepository } from "@/infrastructure/repositories/in-memory-brand-repository";
import { InMemoryBrandsCopyRepository } from "@/infrastructure/repositories/in-memory-brands-copy-repository";
import { InMemoryProductRepository } from "@/infrastructure/repositories/in-memory-product-repository";
import { SEED_BRANDS, SEED_PRODUCTS } from "@/infrastructure/cms/seed";
import type { MediaUploader } from "@/application/ports/media-uploader";

const svg = (body: string, attrs = 'viewBox="0 0 200 50"') => `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

function setup() {
  return { brands: new InMemoryBrandRepository(SEED_BRANDS), products: new InMemoryProductRepository(SEED_PRODUCTS) };
}

describe("Marcas", () => {
  it("valida los SVG: arte plano sí, scripts y recursos externos no", () => {
    expect(inspectSvg(svg('<path d="M0 0h10"/>'))).toEqual({ ok: true, ratio: 4 });
    expect(inspectSvg(svg("", 'width="300px" height="100px"'))).toEqual({ ok: true, ratio: 3 });
    // El DOCTYPE estándar de Illustrator se tolera; las entidades, no.
    expect(inspectSvg(`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">${svg("")}`).ok).toBe(true);
    for (const bad of [
      svg("<script>alert(1)</script>"),
      svg('<rect onload="alert(1)"/>'),
      svg('<a href="javascript:alert(1)"><path/></a>'),
      svg("<foreignObject><div/></foreignObject>"),
      svg('<image href="https://evil.example/x.png"/>'),
      svg('<use xlink:href="https://evil.example/s.svg#a"/>'),
      svg("<style>@import url(https://evil.example/x.css);</style>"),
      `<!DOCTYPE svg [<!ENTITY x "y">]>${svg("")}`,
      svg("", ""),
      "<html></html>",
    ])
      expect(inspectSvg(bad).ok, bad).toBe(false);
    // Referencias internas (#id) sí valen.
    expect(inspectSvg(svg('<defs><path id="a"/></defs><use href="#a"/>')).ok).toBe(true);
    // Los cinco logos que trae el sitio pasan y conservan su proporción.
    for (const b of SEED_BRANDS.filter((x) => x.logo)) {
      const file = readFileSync(`public${b.logo!.src}`, "utf8");
      expect(inspectSvg(file), b.name).toEqual({ ok: true, ratio: b.logo!.ratio });
    }
  });

  it("sube logos SVG o raster y calcula la proporción", async () => {
    const uploaded: string[] = [];
    const uploader: MediaUploader = { kind: "local", upload: async (f) => (uploaded.push(f.contentType), { src: `/api/media/${uploaded.length}.x`, width: f.width, height: f.height }) };
    const uc = new UploadBrandLogo(uploader);
    const enc = (s: string) => new TextEncoder().encode(s);
    await expect(uc.execute({ bytes: enc(svg("<path/>")), contentType: "image/svg+xml", filename: "a.svg", width: 1, height: 1 })).resolves.toMatchObject({ ratio: 4 });
    await expect(uc.execute({ bytes: new Uint8Array([1]), contentType: "image/png", filename: "a.png", width: 600, height: 200 })).resolves.toMatchObject({ ratio: 3 });
    await expect(uc.execute({ bytes: enc(svg("<script/>")), contentType: "image/svg+xml", filename: "b.svg", width: 1, height: 1 })).rejects.toMatchObject({ field: "file" });
    await expect(uc.execute({ bytes: new Uint8Array([1]), contentType: "image/jpeg", filename: "a.jpg", width: 10, height: 10 })).rejects.toMatchObject({ field: "file" });
    expect(uploaded).toEqual(["image/svg+xml", "image/png"]);
  });

  it("no se borra una marca con productos; sin productos, sí", async () => {
    const d = setup();
    await expect(new DeleteBrand(d).execute("rolex")).rejects.toBeInstanceOf(BrandInUseError);
    await expect(new DeleteBrand(d).execute("rolex")).rejects.toThrow(/5 producto/);
    const fresh = await new EnsureBrand(d).execute("Jaeger-LeCoultre");
    await new DeleteBrand(d).execute(fresh.slug);
    expect(await d.brands.findBySlug(fresh.slug)).toBeNull();
  });

  it("renombrar una marca cambia la marca de sus productos; no admite nombres repetidos", async () => {
    const d = setup();
    const rolex = (await new ListAdminBrands(d).execute()).find((b) => b.slug === "rolex")!;
    const saved = await new SaveBrand(d).execute({ ...rolex, originalSlug: "rolex", name: "ROLEX SA", description: null, color: rolex.color ?? "" });
    expect(saved).toMatchObject({ slug: "rolex", name: "ROLEX SA", productCount: 5 });
    expect((await d.products.findAll()).filter((p) => p.brand === "ROLEX SA")).toHaveLength(5);
    expect(await d.products.countByBrand("Rolex")).toBe(0);

    await expect(new SaveBrand(d).execute({ originalSlug: null, name: "cartíer", description: null, lines: [], logo: null, color: null, visible: true })).rejects.toMatchObject({ field: "name" });
    await expect(new SaveBrand(d).execute({ originalSlug: null, name: "X", description: null, lines: [], logo: null, color: "rojo", visible: true })).rejects.toBeInstanceOf(ZodError);
    await expect(new SaveBrand(d).execute({ originalSlug: null, name: "X", description: null, lines: [], logo: { src: "https://evil.example/x.svg", ratio: 2, mode: "silhouette" }, color: null, visible: true })).rejects.toBeInstanceOf(ZodError);
    // Crear al vuelo devuelve la existente si ya está (sin tildes ni mayúsculas).
    expect((await new EnsureBrand(d).execute("  cartier ")).slug).toBe("cartier");
  });

  it("el marquee sigue el orden del panel y muestra solo las visibles con productos", async () => {
    const d = setup();
    const copy = new InMemoryBrandsCopyRepository();
    const list = await new ListAdminBrands(d).execute();
    const reversed = [...list].reverse().map((b) => b.slug);
    await new ReorderBrands(d.brands).execute(reversed);
    const marquee = await new ListMarqueeBrands({ ...d, brandsCopy: copy }).execute({ label: "l", disclaimer: "d" });
    const withProducts = reversed.filter((s) => list.find((b) => b.slug === s)!.productCount > 0);
    expect(marquee.brands.map((b) => brandKey(b.name))).toEqual(withProducts.map((s) => brandKey(list.find((b) => b.slug === s)!.name)));

    await new EnsureBrand(d).execute("Sin Piezas");
    const omega = list.find((b) => b.slug === "omega")!;
    await new SaveBrand(d).execute({ ...omega, originalSlug: "omega", visible: false, description: null, color: omega.color ?? "" });
    const names = (await new ListMarqueeBrands({ ...d, brandsCopy: copy }).execute({ label: "l", disclaimer: "d" })).brands.map((b) => b.name);
    expect(names).not.toContain("Sin Piezas");
    expect(names).not.toContain("Omega");
  });

  it("las marcas del seed salen de los productos, con los logos que trae el sitio", () => {
    expect(new Set(SEED_BRANDS.map((b) => brandKey(b.name))).size).toBe(SEED_BRANDS.length);
    expect(SEED_BRANDS.filter((b) => b.logo).map((b) => b.slug).sort()).toEqual(["cartier", "grand-seiko", "omega", "rolex", "tudor"]);
    for (const p of SEED_PRODUCTS) expect(SEED_BRANDS.some((b) => brandKey(b.name) === brandKey(p.brand)), p.brand).toBe(true);
  });
});

describe("Logos: el src no puede salir del url() de CSS", () => {
  it("rechaza paréntesis, comillas, punto y coma y ..", async () => {
    const { BrandLogoInputSchema } = await import("@/application/dto/brand.dto");
    const ok = (src: string) => BrandLogoInputSchema.safeParse({ src, ratio: 2, mode: "silhouette" }).success;
    expect(ok("/assets/logos/brands/rolex.svg")).toBe(true);
    expect(ok("https://res.cloudinary.com/demo/image/upload/v1/tienda/sitio/marcas/x.png")).toBe(true);
    expect(ok("/assets/logos/brands/rolex.svg);background-image:url(https://evil.example/t.png);x:(")).toBe(false);
    expect(ok('/assets/x.svg"')).toBe(false);
    expect(ok("/assets/../../etc/passwd")).toBe(false);
  });
});
