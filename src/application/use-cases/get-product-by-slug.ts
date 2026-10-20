import type { ProductRepository } from "@/domain/repositories/product-repository";
import { ProductNotFoundError } from "@/domain/errors";
import { Slug } from "@/domain/value-objects/slug";
import { toProductDetailDto, type ProductDetailDto } from "../dto/product.dto";

export class GetProductBySlug {
  constructor(private readonly products: ProductRepository) {}

  async execute(slug: string): Promise<ProductDetailDto> {
    if (!Slug.isValid(slug)) throw new ProductNotFoundError(slug);
    const product = await this.products.findBySlug(slug);
    if (!product) throw new ProductNotFoundError(slug);
    return toProductDetailDto(product);
  }
}
