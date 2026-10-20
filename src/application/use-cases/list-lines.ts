import type { LineRepository } from "@/domain/repositories/line-repository";
import type { ProductRepository } from "@/domain/repositories/product-repository";
import type { LineDto } from "../dto/catalog.dto";
import { toLineDto } from "./browse-catalog";

/** Líneas con productos publicados, en el orden del panel. Alimenta la home, el menú y el sitemap. */
export class ListLines {
  constructor(private readonly deps: { lines: LineRepository; products: ProductRepository }) {}

  async execute(): Promise<LineDto[]> {
    const [lines, products] = await Promise.all([this.deps.lines.list(), this.deps.products.findAll()]);
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.line, (counts.get(p.line) ?? 0) + 1);
    return lines.map((l) => toLineDto(l, counts.get(l.slug) ?? 0)).filter((l) => l.count > 0);
  }
}
