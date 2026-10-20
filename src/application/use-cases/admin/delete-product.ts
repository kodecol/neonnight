import type { ProductRepository } from "@/domain/repositories/product-repository";
import { ProductNotFoundError } from "@/domain/errors";

export class DeleteProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string): Promise<{ slug: string }> {
    const p = await this.products.findById(id);
    if (!p) throw new ProductNotFoundError(id);
    await this.products.delete(p.id);
    return { slug: p.slug.value };
  }
}
