import type { WatchRepository } from "@/domain/repositories/watch-repository";
import type { Watch, WatchImage } from "@/domain/entities/watch";
import type { AdminImageInput, AdminWatchFormDto } from "../../dto/admin.dto";

const toImage = (img: WatchImage): AdminImageInput => ({ src: img.src, width: img.width, height: img.height, alt: img.alt });

export function toAdminWatchForm(w: Watch): AdminWatchFormDto {
  return {
    id: w.id,
    brand: w.brand,
    model: w.model,
    reference: w.reference.value,
    slug: w.slug.value,
    priceUnits: w.price.units,
    category: w.category,
    condition: w.condition,
    availability: w.availability,
    featured: w.featured,
    subtitle: w.subtitle,
    description: [...w.description],
    includes: [...w.includes],
    specs: { ...w.specs },
    media: {
      front: w.media.front ? toImage(w.media.front) : null,
      back: w.media.back ? toImage(w.media.back) : null,
      gallery: w.media.gallery.map(toImage),
    },
  };
}

/** Formulario vacío para un reloj nuevo. */
export function emptyAdminWatchForm(defaultCategory: string): AdminWatchFormDto {
  return {
    id: null,
    brand: "",
    model: "",
    reference: "",
    slug: "",
    priceUnits: 0,
    category: defaultCategory,
    condition: "excelente",
    availability: "disponible",
    featured: false,
    subtitle: "",
    description: [],
    includes: ["Caja y papeles"],
    specs: { movement: "", powerReserveHours: null, caseMm: 40, caseMaterial: "", crystal: "Zafiro", waterResistanceM: null },
    media: { front: null, back: null, gallery: [] },
  };
}

export class GetAdminWatch {
  constructor(private readonly watches: WatchRepository) {}

  async execute(id: string): Promise<AdminWatchFormDto | null> {
    const w = await this.watches.findById(id);
    return w ? toAdminWatchForm(w) : null;
  }
}
