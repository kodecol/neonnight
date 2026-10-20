import type { CategoryRepository } from "@/domain/repositories/category-repository";
import type { WatchRepository } from "@/domain/repositories/watch-repository";
import { CategoryInUseError } from "@/domain/errors";
import { Slug } from "@/domain/value-objects/slug";
import { FieldValidationError } from "../../lib/errors";
import { CategoryInputSchema, type CategoryDto } from "../../dto/admin.dto";

interface Deps {
  categories: CategoryRepository;
  watches: WatchRepository;
}

export class ListCategories {
  constructor(private readonly deps: Deps) {}

  async execute(): Promise<CategoryDto[]> {
    const list = await this.deps.categories.list();
    const counts = await Promise.all(list.map((c) => this.deps.watches.countByCategory(c.slug)));
    return list.map((c, i) => ({ ...c, watchCount: counts[i] ?? 0 }));
  }
}

/**
 * Alta o edición de categoría. El slug es la identidad (lo usan los relojes y
 * la URL `?categoria=`): se fija al crearla y luego solo cambian nombre y orden.
 */
export class SaveCategory {
  constructor(private readonly deps: Deps) {}

  async execute(raw: unknown): Promise<{ slug: string }> {
    const input = CategoryInputSchema.parse(raw);
    const existing = await this.deps.categories.list();

    if (input.originalSlug !== null) {
      const prev = existing.find((c) => c.slug === input.originalSlug);
      if (!prev) throw new FieldValidationError("slug", "La categoría ya no existe.");
      await this.deps.categories.save({ slug: prev.slug, label: input.label, order: input.order });
      return { slug: prev.slug };
    }

    const candidate = input.slug || input.label;
    let slug: string;
    try {
      slug = Slug.fromText(candidate).value;
    } catch {
      throw new FieldValidationError("slug", "No se pudo generar un slug válido.");
    }
    if (existing.some((c) => c.slug === slug)) throw new FieldValidationError("slug", `Ya existe la categoría "${slug}".`);
    await this.deps.categories.save({ slug, label: input.label, order: input.order });
    return { slug };
  }
}

export class DeleteCategory {
  constructor(private readonly deps: Deps) {}

  async execute(slug: string): Promise<void> {
    const count = await this.deps.watches.countByCategory(slug);
    if (count > 0) throw new CategoryInUseError(slug, count);
    await this.deps.categories.delete(slug);
  }
}
