import type { WatchRepository } from "@/domain/repositories/watch-repository";
import { WatchNotFoundError } from "@/domain/errors";
import { Slug } from "@/domain/value-objects/slug";
import { toWatchDetailDto, type WatchDetailDto } from "../dto/watch.dto";

export class GetWatchBySlug {
  constructor(private readonly watches: WatchRepository) {}

  async execute(slug: string): Promise<WatchDetailDto> {
    if (!Slug.isValid(slug)) throw new WatchNotFoundError(slug);
    const watch = await this.watches.findBySlug(slug);
    if (!watch) throw new WatchNotFoundError(slug);
    return toWatchDetailDto(watch);
  }
}
