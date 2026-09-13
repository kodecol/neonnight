import type { WatchRepository } from "@/domain/repositories/watch-repository";
import type { WatchCategory } from "@/domain/entities/watch";
import { Money } from "@/domain/value-objects/money";
import { toWatchSummaryDto, type WatchSummaryDto } from "../dto/watch.dto";

export interface ListWatchesQuery {
  readonly category?: WatchCategory;
  /** Precio máximo en unidades (pesos). */
  readonly maxPriceUnits?: number;
  readonly limit?: number;
}

export class ListWatches {
  constructor(private readonly watches: WatchRepository) {}

  async execute(query: ListWatchesQuery = {}): Promise<WatchSummaryDto[]> {
    const all = await this.watches.findAll({
      category: query.category,
      maxPrice: query.maxPriceUnits === undefined ? undefined : Money.fromUnits(query.maxPriceUnits),
    });
    const sliced = query.limit === undefined ? all : all.slice(0, query.limit);
    return sliced.map(toWatchSummaryDto);
  }
}
