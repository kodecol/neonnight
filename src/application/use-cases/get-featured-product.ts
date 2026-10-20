import type { ProductRepository } from "@/domain/repositories/product-repository";
import { toProductDetailDto, type ProductDetailDto } from "../dto/product.dto";

export class GetFeaturedProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(): Promise<ProductDetailDto | null> {
    const product = await this.products.findFeatured();
    return product ? toProductDetailDto(product) : null;
  }
}
