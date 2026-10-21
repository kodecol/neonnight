import type { BrandsCopy, BrandsCopyRepository } from "@/application/ports/brands-copy";

export class InMemoryBrandsCopyRepository implements BrandsCopyRepository {
  constructor(private copy: BrandsCopy = { label: null, disclaimer: null }) {}

  async get(): Promise<BrandsCopy> {
    return this.copy;
  }

  async save(copy: BrandsCopy): Promise<void> {
    this.copy = copy;
  }
}
