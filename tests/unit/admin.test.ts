import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { InMemoryProductRepository } from "@/infrastructure/repositories/in-memory-product-repository";
import { InMemoryCategoryRepository } from "@/infrastructure/repositories/in-memory-category-repository";
import { InMemoryLineRepository } from "@/infrastructure/repositories/in-memory-line-repository";
import { InMemoryPaymentSettingsRepository } from "@/infrastructure/repositories/in-memory-payment-settings-repository";
import { SEED_CATEGORIES, SEED_LINES, SEED_PRODUCTS } from "@/infrastructure/cms/seed";
import { SaveProduct } from "@/application/use-cases/admin/save-product";
import { DeleteProduct } from "@/application/use-cases/admin/delete-product";
import { GetAdminProduct, emptyAdminProductForm } from "@/application/use-cases/admin/get-admin-product";
import { ListAdminProducts } from "@/application/use-cases/admin/list-admin-products";
import { DeleteCategory, ListCategories, SaveCategory } from "@/application/use-cases/admin/categories";
import { DeleteLine, ListAdminLines, SaveLine } from "@/application/use-cases/admin/lines";
import { SavePaymentSettings } from "@/application/use-cases/admin/payment-settings";
import { UploadImage } from "@/application/use-cases/admin/upload-image";
import { FieldValidationError } from "@/application/lib/errors";
import { CategoryInUseError, LineInUseError } from "@/domain/errors";
import type { AdminProductInput } from "@/application/dto/admin.dto";

const clock = { now: () => new Date("2026-10-03T12:00:00Z") };
const ids = () => {
  let n = 0;
  return { next: () => `t${++n}` };
};

function setup() {
  return {
    products: new InMemoryProductRepository(SEED_PRODUCTS),
    categories: new InMemoryCategoryRepository(SEED_CATEGORIES),
    lines: new InMemoryLineRepository(SEED_LINES),
    clock,
    ids: ids(),
  };
}

const watchInput = (over: Partial<AdminProductInput> = {}): AdminProductInput => ({
  id: null,
  line: "relojeria",
  category: "automatico",
  brand: "IWC",
  model: "Portugieser",
  reference: "iw371605",
  slug: "iwc-portugieser-iw371605",
  condition: "excelente",
  availability: "disponible",
  featured: false,
  subtitle: "Cronógrafo · 41 mm",
  description: ["Un clásico de vestir."],
  includes: ["Caja y papeles"],
  specs: { kind: "reloj", movement: "Automático · Cal. 69355", powerReserveHours: 46, caseMm: 41, caseMaterial: "acero", crystal: "Zafiro", waterResistanceM: 30 },
  variants: [{ id: null, label: "", priceUnits: 28_500_000, stock: 1 }],
  media: { front: { src: "/api/media/x.png", width: 1000, height: 1000 }, back: null, gallery: [] },
  ...over,
});

const perfumeInput = (over: Partial<AdminProductInput> = {}): AdminProductInput => ({
  ...watchInput(),
  line: "perfumeria",
  category: "amaderados",
  brand: "Maison Margiela",
  model: "By the Fireplace",
  reference: "",
  slug: "maison-margiela-by-the-fireplace",
  condition: "nuevo",
  subtitle: "Eau de Toilette · Unisex",
  specs: { kind: "perfume", concentration: "Eau de Toilette", gender: "unisex", perfumer: "Marie Salamagne", year: 2015, notes: { top: ["Clavo"], heart: ["Castaña"], base: ["Vainilla"] } },
  variants: [
    { id: null, label: "30 ml", priceUnits: 480_000, stock: 5 },
    { id: null, label: "100 ml", priceUnits: 790_000, stock: 2 },
  ],
  ...over,
});

describe("SaveProduct", () => {
  it("crea un reloj con value objects, variante única y alt automático", async () => {
    const deps = setup();
    const res = await new SaveProduct(deps).execute(watchInput());
    expect(res.id).toBe("p-t1");
    const p = await deps.products.findById(res.id);
    expect(p?.reference.value).toBe("IW371605");
    expect(p?.variants).toHaveLength(1);
    expect(p?.variants[0]?.price.format()).toBe("$ 28.500.000 COP");
    expect(p?.media.front?.alt).toBe("IWC Portugieser vista principal");
    expect((await deps.products.findAll())[0]?.id).toBe("p-t1"); // lo nuevo primero
  });

  it("crea un perfume con presentaciones y ficha propia", async () => {
    const deps = setup();
    const { id } = await new SaveProduct(deps).execute(perfumeInput());
    const p = await deps.products.findById(id);
    expect(p?.line).toBe("perfumeria");
    expect(p?.variants.map((v) => [v.label, v.price.units, v.stock])).toEqual([
      ["30 ml", 480_000, 5],
      ["100 ml", 790_000, 2],
    ]);
    expect(new Set(p?.variants.map((v) => v.id)).size).toBe(2);
  });

  it("valida campos, plantilla, categoría de la línea y presentaciones", async () => {
    const deps = setup();
    const uc = new SaveProduct(deps);
    await expect(uc.execute(watchInput({ brand: "", variants: [] }))).rejects.toBeInstanceOf(ZodError);
    await expect(uc.execute(watchInput({ category: "nope" }))).rejects.toMatchObject({ field: "category" });
    await expect(uc.execute(watchInput({ category: "florales" }))).rejects.toMatchObject({ field: "category" });
    await expect(uc.execute(perfumeInput({ line: "relojeria", category: "automatico" }))).rejects.toMatchObject({ field: "specs" });
    await expect(uc.execute(watchInput({ line: "gafas" }))).rejects.toMatchObject({ field: "line" });
    await expect(
      uc.execute(perfumeInput({ variants: [{ id: null, label: "50 ml", priceUnits: 1, stock: 1 }, { id: null, label: "", priceUnits: 1, stock: 1 }] })),
    ).rejects.toMatchObject({ field: "variants.1.label" });
    await expect(
      uc.execute(perfumeInput({ variants: [{ id: null, label: "50 ml", priceUnits: 1, stock: 1 }, { id: null, label: "50 ML", priceUnits: 1, stock: 1 }] })),
    ).rejects.toMatchObject({ field: "variants.1.label" });
    await expect(uc.execute(watchInput({ media: { front: { src: "https://evil.example/x.png", width: 1, height: 1 }, back: null, gallery: [] } }))).rejects.toBeInstanceOf(ZodError);
  });

  it("rechaza un slug ya usado por otro producto", async () => {
    const deps = setup();
    const err = await new SaveProduct(deps).execute(watchInput({ slug: "rolex-sky-dweller-326938" })).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FieldValidationError);
    expect((err as FieldValidationError).field).toBe("slug");
  });

  it("al editar conserva hero/video e ids de variantes, y deja un único destacado", async () => {
    const deps = setup();
    const form = (await new GetAdminProduct(deps.products).execute("w-02"))!;
    await new SaveProduct(deps).execute({ ...form, featured: true, variants: [{ ...form.variants[0]!, priceUnits: 1_000_000 }] });
    const all = await deps.products.findAll();
    expect(all.filter((p) => p.featured).map((p) => p.id)).toEqual(["w-02"]);
    expect((await deps.products.findById("w-02"))?.variants[0]).toMatchObject({ id: "unica" });

    const ref01 = (await new GetAdminProduct(deps.products).execute("w-01"))!;
    await new SaveProduct(deps).execute({ ...ref01, subtitle: "Editado" });
    const w01 = await deps.products.findById("w-01");
    expect(w01?.media.hero && "poster" in w01.media.hero).toBe(true);
    expect(w01?.media.video?.src).toBe("/assets/vertical-daytona.mp4");
    expect(w01?.subtitle).toBe("Editado");
  });

  it("el formulario vacío respeta la plantilla de la línea", () => {
    const perfumeria = SEED_LINES.find((l) => l.slug === "perfumeria")!;
    const form = emptyAdminProductForm(perfumeria, "florales");
    expect(form.specs.kind).toBe("perfume");
    expect(form.variants.map((v) => v.label)).toEqual(["50 ml", "100 ml"]);
  });

  it("lista para el panel con línea, stock y estado; DeleteProduct elimina", async () => {
    const deps = setup();
    const rows = await new ListAdminProducts(deps).execute();
    const aventus = rows.find((r) => r.slug === "creed-aventus")!;
    expect(aventus).toMatchObject({ lineLabel: "Perfumería", categoryLabel: "Frescos y aromáticos", stock: 7, variantCount: 2, priceFrom: true });
    await new DeleteProduct(deps.products).execute("w-03");
    expect(await deps.products.findById("w-03")).toBeNull();
  });
});

describe("Categorías", () => {
  it("crea dentro de una línea con slug derivado y lista con conteo", async () => {
    const deps = setup();
    const { slug } = await new SaveCategory(deps).execute({ originalSlug: null, slug: "", label: "Vestir clásico", order: 5, line: "relojeria" });
    expect(slug).toBe("vestir-clasico");
    const list = await new ListCategories(deps).execute();
    expect(list.find((c) => c.slug === "vestir-clasico")).toMatchObject({ line: "relojeria", productCount: 0 });
    expect(list.find((c) => c.slug === "cronografo")?.productCount).toBe(2);
  });

  it("no duplica slugs, exige línea existente y no mueve categorías con productos", async () => {
    const deps = setup();
    const uc = new SaveCategory(deps);
    await expect(uc.execute({ originalSlug: null, slug: "", label: "GMT", order: 9, line: "relojeria" })).rejects.toMatchObject({ field: "label" });
    await expect(uc.execute({ originalSlug: null, slug: "", label: "Gafas", order: 9, line: "nope" })).rejects.toMatchObject({ field: "line" });
    await expect(uc.execute({ originalSlug: "gmt", slug: "gmt", label: "GMT", order: 3, line: "joyeria" })).rejects.toMatchObject({ field: "line" });
    await uc.execute({ originalSlug: "gmt", slug: "otro", label: "Viajero", order: 0, line: "relojeria" });
    expect((await deps.categories.list())[0]).toEqual({ slug: "gmt", label: "Viajero", order: 0, line: "relojeria" });
  });

  it("no elimina categorías en uso", async () => {
    const deps = setup();
    await expect(new DeleteCategory(deps).execute("cronografo")).rejects.toBeInstanceOf(CategoryInUseError);
    await new SaveCategory(deps).execute({ originalSlug: null, slug: "", label: "Vacía", order: 9, line: "joyeria" });
    await new DeleteCategory(deps).execute("vacia");
    expect((await deps.categories.list()).some((c) => c.slug === "vacia")).toBe(false);
  });
});

describe("Líneas", () => {
  it("crea con nombre y plantilla; el slug y la plantilla no cambian al editar", async () => {
    const deps = setup();
    const { slug } = await new SaveLine(deps).execute({ originalSlug: null, slug: "", label: "Gafas de sol", description: "", order: 4, template: "general", cover: null });
    expect(slug).toBe("gafas-de-sol");
    await new SaveLine(deps).execute({ originalSlug: "gafas-de-sol", slug: "otro", label: "Gafas", description: "Monturas de autor.", order: 4, template: "perfume", cover: null });
    const line = (await deps.lines.list()).find((l) => l.slug === "gafas-de-sol");
    expect(line).toMatchObject({ label: "Gafas", template: "general", description: "Monturas de autor." });
  });

  it("rechaza duplicados y nombres reservados", async () => {
    const deps = setup();
    const uc = new SaveLine(deps);
    await expect(uc.execute({ originalSlug: null, slug: "", label: "Joyería", description: "", order: 1, template: "joya", cover: null })).rejects.toMatchObject({ field: "label" });
    await expect(uc.execute({ originalSlug: null, slug: "", label: "Todo", description: "", order: 1, template: "general", cover: null })).rejects.toMatchObject({ field: "label" });
  });

  it("no elimina líneas con productos o categorías y lista con conteos", async () => {
    const deps = setup();
    await expect(new DeleteLine(deps).execute("joyeria")).rejects.toBeInstanceOf(LineInUseError);
    await new SaveLine(deps).execute({ originalSlug: null, slug: "", label: "Gafas", description: "", order: 4, template: "general", cover: null });
    await new SaveCategory(deps).execute({ originalSlug: null, slug: "", label: "Sol", order: 1, line: "gafas" });
    await expect(new DeleteLine(deps).execute("gafas")).rejects.toBeInstanceOf(LineInUseError);
    await new DeleteCategory(deps).execute("sol");
    await new DeleteLine(deps).execute("gafas");
    const list = await new ListAdminLines(deps).execute();
    expect(list.map((l) => [l.slug, l.productCount, l.categoryCount])).toEqual([
      ["relojeria", 12, 5],
      ["joyeria", 8, 4],
      ["perfumeria", 10, 4],
    ]);
  });
});

describe("SavePaymentSettings", () => {
  it("exige llaves según el modo y conserva la secreta si llega vacía", async () => {
    const settings = new InMemoryPaymentSettingsRepository();
    const uc = new SavePaymentSettings({ settings, clock });
    await expect(uc.execute({ enabled: true, mode: "pruebas", identityKey: "", secretKey: "" })).rejects.toMatchObject({ field: "identityKey" });
    await expect(uc.execute({ enabled: true, mode: "produccion", identityKey: "pk", secretKey: "" })).rejects.toMatchObject({ field: "secretKey" });

    const view = await uc.execute({ enabled: true, mode: "produccion", identityKey: "pk", secretKey: "sk_live_12345678" });
    expect(view).toMatchObject({ ready: true, secretKeyHint: "••••5678" });
    await uc.execute({ enabled: true, mode: "produccion", identityKey: "pk2", secretKey: "" });
    expect((await settings.get()).secretKey).toBe("sk_live_12345678");
  });
});

describe("UploadImage", () => {
  const uploader = { kind: "local" as const, upload: async () => ({ src: "/api/media/a.png", width: 10, height: 10 }) };
  const file = { bytes: new Uint8Array([1]), contentType: "image/png", filename: "a.png", width: 10, height: 10 };

  it("valida tipo, tamaño y dimensiones", async () => {
    const uc = new UploadImage(uploader);
    await expect(uc.execute(file)).resolves.toMatchObject({ src: "/api/media/a.png" });
    await expect(uc.execute({ ...file, contentType: "image/svg+xml" })).rejects.toBeInstanceOf(FieldValidationError);
    await expect(uc.execute({ ...file, bytes: new Uint8Array(9 * 1024 * 1024) })).rejects.toBeInstanceOf(FieldValidationError);
    await expect(uc.execute({ ...file, width: 0 })).rejects.toBeInstanceOf(FieldValidationError);
  });
});
