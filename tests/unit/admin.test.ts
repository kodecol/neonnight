import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { InMemoryWatchRepository } from "@/infrastructure/repositories/in-memory-watch-repository";
import { InMemoryCategoryRepository } from "@/infrastructure/repositories/in-memory-category-repository";
import { InMemoryPaymentSettingsRepository } from "@/infrastructure/repositories/in-memory-payment-settings-repository";
import { SEED_CATEGORIES, SEED_WATCHES } from "@/infrastructure/cms/seed";
import { SaveWatch } from "@/application/use-cases/admin/save-watch";
import { DeleteWatch } from "@/application/use-cases/admin/delete-watch";
import { GetAdminWatch } from "@/application/use-cases/admin/get-admin-watch";
import { DeleteCategory, ListCategories, SaveCategory } from "@/application/use-cases/admin/categories";
import { SavePaymentSettings } from "@/application/use-cases/admin/payment-settings";
import { UploadImage } from "@/application/use-cases/admin/upload-image";
import { FieldValidationError } from "@/application/lib/errors";
import { CategoryInUseError } from "@/domain/errors";
import type { AdminWatchInput } from "@/application/dto/admin.dto";

const clock = { now: () => new Date("2026-10-03T12:00:00Z") };
const ids = () => {
  let n = 0;
  return { next: () => `t${++n}` };
};

function setup() {
  const watches = new InMemoryWatchRepository(SEED_WATCHES);
  const categories = new InMemoryCategoryRepository(SEED_CATEGORIES);
  return { watches, categories, clock, ids: ids() };
}

const input = (over: Partial<AdminWatchInput> = {}): AdminWatchInput => ({
  id: null,
  brand: "Grand Seiko",
  model: "Snowflake",
  reference: "sbga211",
  slug: "grand-seiko-snowflake-sbga211",
  priceUnits: 28_500_000,
  category: "automatico",
  condition: "excelente",
  availability: "disponible",
  featured: false,
  subtitle: "Spring Drive · 41 mm",
  description: ["Esfera textura nieve."],
  includes: ["Caja y papeles"],
  specs: { movement: "Spring Drive 9R65", powerReserveHours: 72, caseMm: 41, caseMaterial: "titanio", crystal: "Zafiro", waterResistanceM: 100 },
  media: { front: { src: "/api/media/x.png", width: 1000, height: 1000 }, back: null, gallery: [] },
  ...over,
});

describe("SaveWatch", () => {
  it("crea un reloj nuevo con value objects y alt automático", async () => {
    const deps = setup();
    const res = await new SaveWatch(deps).execute(input());
    expect(res.id).toBe("w-t1");
    const w = await deps.watches.findById(res.id);
    expect(w?.reference.value).toBe("SBGA211");
    expect(w?.price.format()).toBe("$ 28.500.000 COP");
    expect(w?.media.front?.alt).toBe("Grand Seiko Snowflake vista frontal");
    expect((await deps.watches.findAll())[0]?.id).toBe("w-t1"); // lo nuevo primero
  });

  it("valida campos y categoría", async () => {
    const deps = setup();
    await expect(new SaveWatch(deps).execute(input({ brand: "", priceUnits: 0 }))).rejects.toBeInstanceOf(ZodError);
    await expect(new SaveWatch(deps).execute(input({ category: "nope" }))).rejects.toMatchObject({ field: "category" });
    await expect(
      new SaveWatch(deps).execute(input({ media: { front: { src: "https://evil.example/x.png", width: 1, height: 1 }, back: null, gallery: [] } })),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("rechaza un slug ya usado por otro reloj", async () => {
    const deps = setup();
    const err = await new SaveWatch(deps).execute(input({ slug: "rolex-sky-dweller-326938" })).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FieldValidationError);
    expect((err as FieldValidationError).field).toBe("slug");
  });

  it("al editar conserva hero/video y deja un único destacado", async () => {
    const deps = setup();
    const form = (await new GetAdminWatch(deps.watches).execute("w-02"))!;
    await new SaveWatch(deps).execute({ ...form, featured: true, priceUnits: 1_000_000 });
    const all = await deps.watches.findAll();
    expect(all.filter((w) => w.featured).map((w) => w.id)).toEqual(["w-02"]);

    const ref01 = (await new GetAdminWatch(deps.watches).execute("w-01"))!;
    await new SaveWatch(deps).execute({ ...ref01, subtitle: "Editado" });
    const w01 = await deps.watches.findById("w-01");
    expect(w01?.media.hero && "poster" in w01.media.hero).toBe(true);
    expect(w01?.media.video?.src).toBe("/assets/vertical-daytona.mp4");
    expect(w01?.subtitle).toBe("Editado");
  });

  it("DeleteWatch elimina", async () => {
    const deps = setup();
    await new DeleteWatch(deps.watches).execute("w-03");
    expect(await deps.watches.findById("w-03")).toBeNull();
  });
});

describe("Categorías", () => {
  it("crea con slug derivado del nombre y lista con conteo", async () => {
    const deps = setup();
    const { slug } = await new SaveCategory(deps).execute({ originalSlug: null, slug: "", label: "Vestir clásico", order: 5 });
    expect(slug).toBe("vestir-clasico");
    const list = await new ListCategories(deps).execute();
    expect(list.at(-1)).toMatchObject({ slug: "vestir-clasico", watchCount: 0 });
    expect(list.find((c) => c.slug === "cronografo")?.watchCount).toBe(2);
  });

  it("no duplica slugs y edita solo nombre y orden", async () => {
    const deps = setup();
    await expect(new SaveCategory(deps).execute({ originalSlug: null, slug: "", label: "GMT", order: 9 })).rejects.toMatchObject({ field: "slug" });
    await new SaveCategory(deps).execute({ originalSlug: "gmt", slug: "otro", label: "Viajero", order: 0 });
    expect((await deps.categories.list())[0]).toEqual({ slug: "gmt", label: "Viajero", order: 0 });
  });

  it("no elimina categorías en uso", async () => {
    const deps = setup();
    await expect(new DeleteCategory(deps).execute("cronografo")).rejects.toBeInstanceOf(CategoryInUseError);
    await new SaveCategory(deps).execute({ originalSlug: null, slug: "", label: "Vacía", order: 9 });
    await new DeleteCategory(deps).execute("vacia");
    expect((await deps.categories.list()).some((c) => c.slug === "vacia")).toBe(false);
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
