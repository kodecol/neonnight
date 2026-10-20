import type { WatchRepository } from "@/domain/repositories/watch-repository";

/** Marcas distintas del catálogo, de la más a la menos representada. Alimenta el marquee de la home. */
export class ListBrands {
  constructor(private readonly watches: WatchRepository) {}

  async execute(): Promise<string[]> {
    const counts = new Map<string, number>();
    for (const w of await this.watches.findAll()) {
      const brand = w.brand.trim();
      if (brand) counts.set(brand, (counts.get(brand) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).map(([b]) => b);
  }
}
