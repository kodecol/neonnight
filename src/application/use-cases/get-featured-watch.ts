import type { WatchRepository } from "@/domain/repositories/watch-repository";
import { toWatchDetailDto, type WatchDetailDto } from "../dto/watch.dto";

export class GetFeaturedWatch {
  constructor(private readonly watches: WatchRepository) {}

  async execute(): Promise<WatchDetailDto | null> {
    const watch = await this.watches.findFeatured();
    return watch ? toWatchDetailDto(watch) : null;
  }
}
