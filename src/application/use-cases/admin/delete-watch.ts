import type { WatchRepository } from "@/domain/repositories/watch-repository";
import { WatchNotFoundError } from "@/domain/errors";

export class DeleteWatch {
  constructor(private readonly watches: WatchRepository) {}

  async execute(id: string): Promise<{ slug: string }> {
    const w = await this.watches.findById(id);
    if (!w) throw new WatchNotFoundError(id);
    await this.watches.delete(w.id);
    return { slug: w.slug.value };
  }
}
