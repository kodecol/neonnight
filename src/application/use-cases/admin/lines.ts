import type { LineRepository } from "@/domain/repositories/line-repository";
import type { CategoryRepository } from "@/domain/repositories/category-repository";
import type { ProductRepository } from "@/domain/repositories/product-repository";
import type { ProductImage } from "@/domain/entities/product";
import { LineInUseError } from "@/domain/errors";
import { Slug } from "@/domain/value-objects/slug";
import { FieldValidationError } from "../../lib/errors";
import { LineInputSchema, type AdminLineDto } from "../../dto/admin.dto";

interface Deps {
  lines: LineRepository;
  categories: CategoryRepository;
  products: ProductRepository;
}

/** Rutas que ya existen bajo /coleccion o que confundirían la URL de una línea. */
const RESERVED = new Set(["todo", "todas", "nuevo", "admin"]);

export class ListAdminLines {
  constructor(private readonly deps: Deps) {}

  async execute(): Promise<AdminLineDto[]> {
    const [lines, categories] = await Promise.all([this.deps.lines.list(), this.deps.categories.list()]);
    const counts = await Promise.all(lines.map((l) => this.deps.products.countByLine(l.slug)));
    return lines.map((l, i) => ({
      slug: l.slug,
      label: l.label,
      description: l.description,
      order: l.order,
      template: l.template,
      cover: l.cover ? { ...l.cover } : null,
      productCount: counts[i] ?? 0,
      categoryCount: categories.filter((c) => c.line === l.slug).length,
    }));
  }
}

/**
 * Alta o edición de línea. Slug y plantilla se fijan al crearla: los usan los
 * productos (su ficha depende de la plantilla) y la URL `/coleccion/<slug>`.
 */
export class SaveLine {
  constructor(private readonly deps: Pick<Deps, "lines">) {}

  async execute(raw: unknown): Promise<{ slug: string }> {
    const input = LineInputSchema.parse(raw);
    const existing = await this.deps.lines.list();
    const cover: ProductImage | null = input.cover ? { src: input.cover.src, width: input.cover.width, height: input.cover.height, alt: input.cover.alt || input.label } : null;

    if (input.originalSlug !== null) {
      const prev = existing.find((l) => l.slug === input.originalSlug);
      if (!prev) throw new FieldValidationError("slug", "La línea ya no existe.");
      await this.deps.lines.save({ ...prev, label: input.label, description: input.description, order: input.order, cover });
      return { slug: prev.slug };
    }

    let slug: string;
    try {
      slug = Slug.fromText(input.slug || input.label).value;
    } catch {
      throw new FieldValidationError("label", "No se pudo generar un slug válido.");
    }
    if (RESERVED.has(slug)) throw new FieldValidationError("label", `"${slug}" está reservado. Usa otro nombre.`);
    if (existing.some((l) => l.slug === slug)) throw new FieldValidationError("label", `Ya existe la línea "${slug}".`);
    await this.deps.lines.save({ slug, label: input.label, description: input.description, order: input.order, template: input.template, cover });
    return { slug };
  }
}

export class DeleteLine {
  constructor(private readonly deps: Deps) {}

  async execute(slug: string): Promise<void> {
    const products = await this.deps.products.countByLine(slug);
    if (products > 0) throw new LineInUseError(slug, `${products} producto(s)`);
    const categories = (await this.deps.categories.list()).filter((c) => c.line === slug).length;
    if (categories > 0) throw new LineInUseError(slug, `${categories} categoría(s)`);
    await this.deps.lines.delete(slug);
  }
}
