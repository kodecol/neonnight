import type { CategoryRepository } from "@/domain/repositories/category-repository";
import type { ProductRepository } from "@/domain/repositories/product-repository";
import type { LineRepository } from "@/domain/repositories/line-repository";
import { CategoryInUseError } from "@/domain/errors";
import { Slug } from "@/domain/value-objects/slug";
import { FieldValidationError } from "../../lib/errors";
import { CategoryInputSchema, type CategoryDto } from "../../dto/admin.dto";

interface Deps {
  categories: CategoryRepository;
  products: ProductRepository;
  lines: LineRepository;
}

export class ListCategories {
  constructor(private readonly deps: Pick<Deps, "categories" | "products">) {}

  async execute(): Promise<CategoryDto[]> {
    const list = await this.deps.categories.list();
    const counts = await Promise.all(list.map((c) => this.deps.products.countByCategory(c.slug)));
    return list.map((c, i) => ({ ...c, productCount: counts[i] ?? 0 }));
  }
}

/**
 * Alta o edición de categoría. El slug es la identidad (lo usan los productos
 * y la URL `?categoria=`): se fija al crearla. La línea solo cambia mientras
 * no tenga productos asignados.
 */
export class SaveCategory {
  constructor(private readonly deps: Deps) {}

  async execute(raw: unknown): Promise<{ slug: string }> {
    const input = CategoryInputSchema.parse(raw);
    const [existing, lines] = await Promise.all([this.deps.categories.list(), this.deps.lines.list()]);
    if (!lines.some((l) => l.slug === input.line)) throw new FieldValidationError("line", "Línea inexistente.");

    if (input.originalSlug !== null) {
      const prev = existing.find((c) => c.slug === input.originalSlug);
      if (!prev) throw new FieldValidationError("slug", "La categoría ya no existe.");
      if (prev.line !== input.line && (await this.deps.products.countByCategory(prev.slug)) > 0) {
        throw new FieldValidationError("line", "Tiene productos asignados: no puede cambiar de línea.");
      }
      await this.deps.categories.save({ slug: prev.slug, label: input.label, order: input.order, line: input.line });
      return { slug: prev.slug };
    }

    const candidate = input.slug || input.label;
    let slug: string;
    try {
      slug = Slug.fromText(candidate).value;
    } catch {
      throw new FieldValidationError("slug", "No se pudo generar un slug válido.");
    }
    if (existing.some((c) => c.slug === slug)) throw new FieldValidationError("label", `Ya existe la categoría "${slug}".`);
    await this.deps.categories.save({ slug, label: input.label, order: input.order, line: input.line });
    return { slug };
  }
}

export class DeleteCategory {
  constructor(private readonly deps: Pick<Deps, "categories" | "products">) {}

  async execute(slug: string): Promise<void> {
    const count = await this.deps.products.countByCategory(slug);
    if (count > 0) throw new CategoryInUseError(slug, count);
    await this.deps.categories.delete(slug);
  }
}
