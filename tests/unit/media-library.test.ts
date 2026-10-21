import { describe, expect, it } from "vitest";
import { InMemoryProductRepository } from "@/infrastructure/repositories/in-memory-product-repository";
import { InMemoryCategoryRepository } from "@/infrastructure/repositories/in-memory-category-repository";
import { InMemoryLineRepository } from "@/infrastructure/repositories/in-memory-line-repository";
import { SEED_BRANDS, SEED_CATEGORIES, SEED_LINES, SEED_PRODUCTS } from "@/infrastructure/cms/seed";
import { InMemoryBrandRepository } from "@/infrastructure/repositories/in-memory-brand-repository";

/** Marcas de las piezas de prueba que no están en el seed. */
const EXTRA_BRANDS = ["IWC", "Maison Margiela"].map((name, i) => ({ slug: name.toLowerCase().replace(/\s+/g, "-"), name, lines: [], logo: null, color: null, visible: true, order: 100 + i, description: null }));
import { SaveProduct } from "@/application/use-cases/admin/save-product";
import { GetAdminProduct } from "@/application/use-cases/admin/get-admin-product";
import { libraryOf, withLibrary } from "@/domain/services/media-library";
import { addImages, emptyMedia, moveImage, removeImage, rolesOf, toggleGallery, toggleRole } from "@/presentation/lib/media-draft";

/** Sin foto de ambiente de la pieza exacta todavía: se sube desde el panel. */
const PENDING_BAND = new Set(["cartier-juste-un-clou-brazalete-oro-rosa", "tom-ford-oud-wood"]);

const img = (n: number) => ({ src: `/api/media/${n}.webp`, width: 1600, height: 1600 });

function setup() {
  let n = 0;
  return {
    products: new InMemoryProductRepository(SEED_PRODUCTS),
    categories: new InMemoryCategoryRepository(SEED_CATEGORIES),
    lines: new InMemoryLineRepository(SEED_LINES),
    brands: new InMemoryBrandRepository([...SEED_BRANDS, ...EXTRA_BRANDS]),
    clock: { now: () => new Date("2026-10-20T12:00:00Z") },
    ids: { next: () => `id${++n}` },
  };
}

describe("Biblioteca de medios del producto", () => {
  it("deriva la biblioteca de los usos sin repetir fotos (documentos antiguos)", () => {
    const front = { ...img(1), alt: "a" };
    const media = withLibrary({ front, back: null, hero: null, band: front, gallery: [front, { ...img(2), alt: "b" }], video: null });
    expect(media.library.map((i) => i.src)).toEqual(["/api/media/1.webp", "/api/media/2.webp"]);
    expect(libraryOf(media)).toHaveLength(2);
  });

  it("todas las piezas del seed tienen imagen final propia y biblioteca con sus usos dentro", () => {
    for (const p of SEED_PRODUCTS) {
      if (PENDING_BAND.has(p.slug.value)) {
        expect(p.media.band, p.slug.value).toBeNull();
        continue;
      }
      expect(p.media.band, p.slug.value).not.toBeNull();
      expect(p.media.band?.src, p.slug.value).not.toBe(p.media.front?.src);
      expect(p.media.band?.src, p.slug.value).toMatch(new RegExp(`${p.slug.value}-editorial\\.webp$`));
      const srcs = new Set(p.media.library.map((i) => i.src));
      for (const used of [p.media.front, p.media.back, p.media.band, ...p.media.gallery]) if (used) expect(srcs.has(used.src), p.slug.value).toBe(true);
    }
  });

  it("en el borrador, un uso tiene una sola foto y una foto puede tener varios usos", () => {
    let m = addImages(emptyMedia(), [img(1), img(2), img(3)]);
    expect(m.roles).toMatchObject({ front: img(1).src, back: img(2).src });
    expect(m.gallery).toEqual([img(1).src, img(2).src, img(3).src]);
    m = toggleRole(m, "band", img(3).src);
    m = toggleRole(m, "hero", img(3).src);
    expect(rolesOf(m, img(3).src)).toEqual(["hero", "band"]);
    m = toggleRole(m, "front", img(3).src);
    expect(m.roles.front).toBe(img(3).src);
    expect(rolesOf(m, img(1).src)).toEqual([]);
    m = toggleGallery(m, img(2).src);
    expect(m.gallery).toEqual([img(1).src, img(3).src]);
    m = moveImage(m, img(3).src, -1);
    m = moveImage(m, img(3).src, -1);
    expect(m.library.map((i) => i.src)).toEqual([img(3).src, img(1).src, img(2).src]);
    expect(m.gallery).toEqual([img(3).src, img(1).src]);
    m = removeImage(m, img(3).src);
    expect(m.roles).toMatchObject({ front: null, hero: null, band: null });
    expect(m.gallery).toEqual([img(1).src]);
  });

  it("el panel guarda la misma foto como hero e imagen final, sin rellenar la banda sola", async () => {
    const deps = setup();
    const form = (await new GetAdminProduct(deps.products).execute("w-02"))!;
    const ambient = img(9);
    await new SaveProduct(deps).execute({
      ...form,
      media: { library: [...form.media.library, ambient], roles: { ...form.media.roles, hero: ambient.src, band: ambient.src }, gallery: form.media.gallery },
    });
    const saved = (await deps.products.findById("w-02"))!;
    expect(saved.media.band?.src).toBe(ambient.src);
    expect(saved.media.hero && "src" in saved.media.hero && saved.media.hero.src).toBe(ambient.src);
    expect(saved.media.band?.alt).toContain("en ambiente");

    // Sin imagen final asignada, la ficha no la muestra (antes se copiaba la portada).
    await new SaveProduct(deps).execute({ ...form, media: { ...form.media, roles: { ...form.media.roles, band: null } } });
    expect((await deps.products.findById("w-02"))!.media.band).toBeNull();
  });

  it("conserva el video del hero mientras el uso diga «video»", async () => {
    const deps = setup();
    const form = (await new GetAdminProduct(deps.products).execute("w-01"))!;
    expect(form.media.roles.hero).toBe("video");
    expect(form.heroVideoPoster).toMatch(/poster/);
    await new SaveProduct(deps).execute(form);
    expect((await deps.products.findById("w-01"))!.media.hero).toMatchObject({ poster: expect.any(String) });
  });
});
