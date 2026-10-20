import { cn } from "@/presentation/lib/cn";
import { ProductCard, type ProductCardItem } from "./ProductCard";

export function ProductGrid({ items, columns, actions, className }: { items: ProductCardItem[]; columns: 3 | 4; actions: boolean; className?: string }) {
  const grid = columns === 3 ? "grid-cols-1 gap-y-12 md:grid-cols-2 md:gap-x-8 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-16" : "grid-cols-1 gap-y-12 md:grid-cols-2 md:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14";
  const sizes = columns === 3 ? "(min-width:1024px) 30vw, (min-width:768px) 45vw, 100vw" : "(min-width:1024px) 22vw, (min-width:768px) 45vw, 100vw";
  return (
    <div className={cn("grid", grid, className)} data-testid="product-grid">
      {items.map((item) => (
        <ProductCard key={item.product.id} item={item} ratio={columns === 3 ? "1/1" : "4/5"} sizes={sizes} actions={actions} />
      ))}
    </div>
  );
}
