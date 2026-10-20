import type { ProductRepository } from "@/domain/repositories/product-repository";
import type { CategoryRepository } from "@/domain/repositories/category-repository";
import type { LineRepository } from "@/domain/repositories/line-repository";
import { productDisplayName, productId, type Product, type ProductImage, type ProductMedia, type ProductVariant } from "@/domain/entities/product";
import { Money } from "@/domain/value-objects/money";
import { Slug } from "@/domain/value-objects/slug";
import { Reference } from "@/domain/value-objects/reference";
import type { Clock, IdGenerator } from "../../ports/clock";
import { FieldValidationError } from "../../lib/errors";
import { AdminProductInputSchema, type AdminImageInput } from "../../dto/admin.dto";

export interface SaveProductDeps {
  products: ProductRepository;
  categories: CategoryRepository;
  lines: LineRepository;
  clock: Clock;
  ids: IdGenerator;
}

const image = (img: AdminImageInput, alt: string): ProductImage => ({ src: img.src, width: img.width, height: img.height, alt: img.alt || alt });

/**
 * Alta o edición de un producto desde el panel. Valida contra la plantilla de
 * su línea, construye la entidad con los value objects del dominio y
 * garantiza un único destacado. Hero, banda y video no se editan en el panel:
 * se conservan.
 */
export class SaveProduct {
  constructor(private readonly deps: SaveProductDeps) {}

  async execute(raw: unknown): Promise<{ id: string; slug: string }> {
    const input = AdminProductInputSchema.parse(raw);
    const { products, categories, lines, clock, ids } = this.deps;

    const prev = input.id ? await products.findById(input.id) : null;
    if (input.id && !prev) throw new FieldValidationError("id", "El producto ya no existe.");

    const [allLines, cats] = await Promise.all([lines.list(), categories.list()]);
    const line = allLines.find((l) => l.slug === input.line);
    if (!line) throw new FieldValidationError("line", "Línea inexistente.");
    if (input.specs.kind !== line.template) throw new FieldValidationError("specs", `La ficha no corresponde a la línea ${line.label}.`);
    if (!cats.some((c) => c.slug === input.category && c.line === line.slug)) throw new FieldValidationError("category", "Elige una categoría de esta línea.");

    const clash = await products.findBySlug(input.slug);
    if (clash && clash.id !== input.id) throw new FieldValidationError("slug", "Otro producto ya usa este slug.");

    if (input.variants.length > 1) {
      const empty = input.variants.findIndex((v) => !v.label);
      if (empty !== -1) throw new FieldValidationError(`variants.${empty}.label`, "Con varias presentaciones, cada una necesita nombre.");
      const seen = new Set<string>();
      input.variants.forEach((v, i) => {
        const key = v.label.toLowerCase();
        if (seen.has(key)) throw new FieldValidationError(`variants.${i}.label`, "Nombre repetido.");
        seen.add(key);
      });
    }

    const id = prev?.id ?? productId(`p-${ids.next()}`);
    const variants: ProductVariant[] = input.variants.map((v) => ({
      id: v.id ?? `${id}-${ids.next().slice(0, 8)}`,
      label: v.label,
      price: Money.fromUnits(v.priceUnits),
      stock: v.stock,
    }));

    const name = productDisplayName(input);
    const front = input.media.front ? image(input.media.front, `${name} vista principal`) : null;
    const back = input.media.back ? image(input.media.back, `${name} segunda vista`) : null;
    const media: ProductMedia = {
      front,
      back,
      gallery: input.media.gallery.map((g, i) => image(g, `${name} imagen ${i + 1}`)),
      hero: prev?.media.hero ?? null,
      // La banda del seed suele ser la foto frontal: si lo era, sigue a la nueva frontal.
      band: prev?.media.band && prev.media.band.src !== prev.media.front?.src ? prev.media.band : front ? { ...front, alt: `${name} detalle` } : null,
      video: prev?.media.video ?? null,
    };

    const product: Product = {
      id,
      slug: Slug.of(input.slug),
      line: line.slug,
      category: input.category,
      brand: input.brand,
      model: input.model,
      reference: Reference.of(input.reference),
      condition: input.condition,
      subtitle: input.subtitle,
      description: input.description,
      specs: input.specs,
      variants,
      media,
      includes: input.includes,
      availability: input.availability,
      featured: input.featured,
      updatedAt: clock.now(),
    };

    if (product.featured) {
      const others = (await products.findAll()).filter((p) => p.featured && p.id !== product.id);
      await Promise.all(others.map((p) => products.save({ ...p, featured: false })));
    }
    await products.save(product);
    return { id: product.id, slug: product.slug.value };
  }
}
