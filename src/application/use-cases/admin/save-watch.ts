import type { WatchRepository } from "@/domain/repositories/watch-repository";
import type { CategoryRepository } from "@/domain/repositories/category-repository";
import { watchDisplayName, watchId, type Watch, type WatchImage, type WatchMedia } from "@/domain/entities/watch";
import { Money } from "@/domain/value-objects/money";
import { Slug } from "@/domain/value-objects/slug";
import { Reference } from "@/domain/value-objects/reference";
import type { Clock, IdGenerator } from "../../ports/clock";
import { FieldValidationError } from "../../lib/errors";
import { AdminWatchInputSchema, type AdminImageInput } from "../../dto/admin.dto";

export interface SaveWatchDeps {
  watches: WatchRepository;
  categories: CategoryRepository;
  clock: Clock;
  ids: IdGenerator;
}

const image = (img: AdminImageInput, alt: string): WatchImage => ({ src: img.src, width: img.width, height: img.height, alt: img.alt || alt });

/**
 * Alta o edición de un reloj desde el panel. Valida, construye la entidad con
 * los value objects del dominio y garantiza un único destacado.
 * Hero, banda y video no se editan en el panel: se conservan.
 */
export class SaveWatch {
  constructor(private readonly deps: SaveWatchDeps) {}

  async execute(raw: unknown): Promise<{ id: string; slug: string }> {
    const input = AdminWatchInputSchema.parse(raw);
    const { watches, categories, clock, ids } = this.deps;

    const prev = input.id ? await watches.findById(input.id) : null;
    if (input.id && !prev) throw new FieldValidationError("id", "El reloj ya no existe.");

    const cats = await categories.list();
    if (!cats.some((c) => c.slug === input.category)) throw new FieldValidationError("category", "Categoría inexistente.");

    const clash = await watches.findBySlug(input.slug);
    if (clash && clash.id !== input.id) throw new FieldValidationError("slug", "Otro reloj ya usa este slug.");

    const name = watchDisplayName(input);
    const front = input.media.front ? image(input.media.front, `${name} vista frontal`) : null;
    const back = input.media.back ? image(input.media.back, `${name} vista trasera`) : null;
    const media: WatchMedia = {
      front,
      back,
      gallery: input.media.gallery.map((g, i) => image(g, `${name} imagen ${i + 1}`)),
      hero: prev?.media.hero ?? null,
      // La banda del seed suele ser la foto frontal: si lo era, sigue a la nueva frontal.
      band: prev?.media.band && prev.media.band.src !== prev.media.front?.src ? prev.media.band : front ? { ...front, alt: `${name} detalle` } : null,
      video: prev?.media.video ?? null,
    };

    const watch: Watch = {
      id: prev?.id ?? watchId(`w-${ids.next()}`),
      slug: Slug.of(input.slug),
      brand: input.brand,
      model: input.model,
      reference: Reference.of(input.reference),
      price: Money.fromUnits(input.priceUnits),
      category: input.category,
      condition: input.condition,
      subtitle: input.subtitle,
      description: input.description,
      specs: input.specs,
      media,
      includes: input.includes,
      availability: input.availability,
      featured: input.featured,
      updatedAt: clock.now(),
    };

    if (watch.featured) {
      const others = (await watches.findAll()).filter((w) => w.featured && w.id !== watch.id);
      await Promise.all(others.map((w) => watches.save({ ...w, featured: false })));
    }
    await watches.save(watch);
    return { id: watch.id, slug: watch.slug.value };
  }
}
