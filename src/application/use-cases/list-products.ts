import type { ProductRepository } from "@/domain/repositories/product-repository";
import { toProductSummaryDto, type ProductSummaryDto } from "../dto/product.dto";

export interface ListProductsQuery {
  readonly line?: string;
  readonly limit?: number;
  /** Alterna líneas (una pieza de cada una por turno) para que una selección corta se vea variada. */
  readonly mixLines?: boolean;
}

export class ListProducts {
  constructor(private readonly products: ProductRepository) {}

  async execute(query: ListProductsQuery = {}): Promise<ProductSummaryDto[]> {
    const all = await this.products.findAll({ line: query.line });
    const ordered = query.mixLines ? interleaveByLine(all) : [...all];
    const sliced = query.limit === undefined ? ordered : ordered.slice(0, query.limit);
    return sliced.map(toProductSummaryDto);
  }
}

function interleaveByLine<T extends { line: string }>(items: readonly T[]): T[] {
  const queues = new Map<string, T[]>();
  for (const it of items) queues.set(it.line, [...(queues.get(it.line) ?? []), it]);
  const out: T[] = [];
  while (out.length < items.length) for (const q of queues.values()) if (q.length) out.push(q.shift()!);
  return out;
}
