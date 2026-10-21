import { brandKey, type Brand } from "@/domain/entities/brand";
import type { BrandRepository } from "@/domain/repositories/brand-repository";
import type { ProductRepository } from "@/domain/repositories/product-repository";
import { BrandInUseError } from "@/domain/errors";
import { Slug } from "@/domain/value-objects/slug";
import type { MediaUploader } from "../../ports/media-uploader";
import type { BrandsCopyRepository } from "../../ports/brands-copy";
import { FieldValidationError } from "../../lib/errors";
import { MAX_SVG_BYTES, inspectSvg, roundRatio } from "../../lib/svg";
import { BrandInputSchema, BrandsCopyInputSchema, type BrandDto, type BrandsCopyInput } from "../../dto/brand.dto";
import { MAX_UPLOAD_BYTES } from "./upload-image";

interface Deps {
  brands: BrandRepository;
  products: ProductRepository;
}

const toDto = (b: Brand, productCount: number): BrandDto => ({
  slug: b.slug,
  name: b.name,
  description: b.description,
  lines: [...b.lines],
  logo: b.logo ? { ...b.logo } : null,
  color: b.color,
  visible: b.visible,
  order: b.order,
  productCount,
});

/** Marcas del panel con su número de productos, en el orden del marquee. */
export class ListAdminBrands {
  constructor(private readonly deps: Deps) {}

  async execute(): Promise<BrandDto[]> {
    const [brands, products] = await Promise.all([this.deps.brands.list(), this.deps.products.findAll()]);
    const counts = new Map<string, number>();
    for (const p of products) counts.set(brandKey(p.brand), (counts.get(brandKey(p.brand)) ?? 0) + 1);
    return brands.map((b) => toDto(b, counts.get(brandKey(b.name)) ?? 0));
  }
}

function slugFor(name: string): string {
  try {
    return Slug.fromText(name).value;
  } catch {
    throw new FieldValidationError("name", "Usa letras o números en el nombre.");
  }
}

/**
 * Alta o edición. El slug se fija al crearla; el nombre se puede cambiar y
 * entonces sus productos pasan al nuevo nombre. No admite dos marcas con el
 * mismo nombre normalizado (sin tildes ni mayúsculas).
 */
export class SaveBrand {
  constructor(private readonly deps: Deps) {}

  async execute(raw: unknown): Promise<BrandDto> {
    const input = BrandInputSchema.parse(raw);
    const all = await this.deps.brands.list();
    const key = brandKey(input.name);
    const clash = all.find((b) => brandKey(b.name) === key && b.slug !== input.originalSlug);
    if (clash) throw new FieldValidationError("name", `Ya existe la marca "${clash.name}".`);

    const prev = input.originalSlug ? all.find((b) => b.slug === input.originalSlug) : null;
    if (input.originalSlug && !prev) throw new FieldValidationError("name", "La marca ya no existe.");
    const brand: Brand = {
      slug: prev?.slug ?? slugFor(input.name),
      name: input.name,
      description: input.description,
      lines: [...new Set(input.lines)],
      logo: input.logo,
      color: input.color,
      visible: input.visible,
      order: prev?.order ?? Math.max(0, ...all.map((b) => b.order)) + 1,
    };
    if (!prev && all.some((b) => b.slug === brand.slug)) throw new FieldValidationError("name", `Ya existe una marca con el identificador "${brand.slug}".`);
    if (prev && prev.name !== brand.name) await this.deps.products.renameBrand(prev.name, brand.name);
    await this.deps.brands.save(brand);
    return toDto(brand, await this.deps.products.countByBrand(brand.name));
  }
}

/** Crea una marca solo con su nombre desde el formulario de producto; si ya existe, la devuelve. */
export class EnsureBrand {
  constructor(private readonly deps: Deps) {}

  async execute(name: string): Promise<BrandDto> {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) throw new FieldValidationError("brand", "Escribe el nombre de la marca.");
    const existing = (await this.deps.brands.list()).find((b) => brandKey(b.name) === brandKey(clean));
    if (existing) return toDto(existing, await this.deps.products.countByBrand(existing.name));
    return new SaveBrand(this.deps).execute({ originalSlug: null, name: clean, description: null, lines: [], logo: null, color: null, visible: true });
  }
}

export class DeleteBrand {
  constructor(private readonly deps: Deps) {}

  async execute(slug: string): Promise<void> {
    const brand = await this.deps.brands.findBySlug(slug);
    if (!brand) return;
    const count = await this.deps.products.countByBrand(brand.name);
    if (count > 0) throw new BrandInUseError(brand.name, count);
    await this.deps.brands.delete(slug);
  }
}

/** Guarda el orden del marquee a partir de la lista de slugs. */
export class ReorderBrands {
  constructor(private readonly brands: BrandRepository) {}

  async execute(slugs: readonly string[]): Promise<void> {
    const all = await this.brands.list();
    const pos = new Map(slugs.map((s, i) => [s, i + 1]));
    // Las que no vengan en la lista quedan al final, en su orden actual.
    const rest = all.filter((b) => !pos.has(b.slug));
    await Promise.all([
      ...all.filter((b) => pos.has(b.slug)).map((b) => this.brands.save({ ...b, order: pos.get(b.slug)! })),
      ...rest.map((b, i) => this.brands.save({ ...b, order: slugs.length + i + 1 })),
    ]);
  }
}

const RASTER: Record<string, true> = { "image/png": true, "image/webp": true, "image/avif": true };

/**
 * Sube el logo de una marca. SVG (revisado: sin scripts ni recursos
 * externos) o PNG, WebP y AVIF. La proporción sale del viewBox del SVG o de
 * las dimensiones de la imagen.
 */
export class UploadBrandLogo {
  constructor(private readonly uploader: MediaUploader) {}

  async execute(file: { bytes: Uint8Array; contentType: string; filename: string; width: number; height: number }): Promise<{ src: string; ratio: number }> {
    if (file.bytes.byteLength === 0) throw new FieldValidationError("file", "El archivo está vacío.");
    if (file.contentType === "image/svg+xml") {
      if (file.bytes.byteLength > MAX_SVG_BYTES) throw new FieldValidationError("file", "El SVG supera 512 KB.");
      const check = inspectSvg(new TextDecoder().decode(file.bytes));
      if (!check.ok) throw new FieldValidationError("file", check.reason);
      const stored = await this.uploader.upload({ ...file, width: Math.round(check.ratio * 100), height: 100 });
      return { src: stored.src, ratio: check.ratio };
    }
    if (!RASTER[file.contentType]) throw new FieldValidationError("file", "Usa SVG, PNG, WebP o AVIF (con fondo transparente).");
    if (file.bytes.byteLength > MAX_UPLOAD_BYTES) throw new FieldValidationError("file", "El logo supera 8 MB.");
    if (!Number.isInteger(file.width) || !Number.isInteger(file.height) || file.width <= 0 || file.height <= 0) {
      throw new FieldValidationError("file", "No se pudieron leer las dimensiones del logo.");
    }
    const stored = await this.uploader.upload(file);
    return { src: stored.src, ratio: roundRatio(stored.width / stored.height) };
  }
}

export class GetBrandsCopy {
  constructor(private readonly copy: BrandsCopyRepository) {}

  async execute(): Promise<BrandsCopyInput> {
    return this.copy.get();
  }
}

export class SaveBrandsCopy {
  constructor(private readonly copy: BrandsCopyRepository) {}

  async execute(raw: unknown): Promise<void> {
    await this.copy.save(BrandsCopyInputSchema.parse(raw));
  }
}
