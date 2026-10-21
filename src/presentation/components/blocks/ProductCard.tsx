import Link from "next/link";
import type { ProductSummaryDto } from "@/application/dto/product.dto";
import { MediaSlot } from "@/presentation/components/primitives/MediaSlot";
import { Price } from "@/presentation/components/primitives/Price";
import { Button } from "@/presentation/components/primitives/Button";
import { ROUTES } from "@/presentation/lib/site";
import { cn } from "@/presentation/lib/cn";
import { AddToCartButton } from "./AddToCartButton";

export interface ProductCardItem {
  product: ProductSummaryDto;
}

/** La tarjeta solo marca lo que cambia la decisión: pocas unidades, reservado o vendido. */
export function StatusBadge({ status, className }: { status: ProductSummaryDto["status"]; className?: string }) {
  if (status.code === "disponible") return null;
  return (
    <span
      className={cn(
        "pointer-events-none z-10 bg-glass px-2.5 py-1.5 text-label-sm uppercase backdrop-blur-sm",
        status.code === "ultimas" ? "text-accent" : status.code === "reservado" ? "text-ink" : "text-ink-2",
        className,
      )}
    >
      {status.label}
    </span>
  );
}

export function ProductCard({ item, ratio, sizes, actions }: { item: ProductCardItem; ratio: "1/1" | "4/5"; sizes: string; actions: boolean }) {
  const { product: p } = item;
  const href = ROUTES.product(p.kind, p.slug);
  const quick = p.purchasable && p.quickVariant && p.quickVariant.maxQuantity > 0 ? p.quickVariant : null;
  return (
    <article className="flex flex-col" data-reveal="1" data-testid="product-card">
      <Link href={href} className="group block">
        <div className={cn("nn-swap relative overflow-hidden bg-surface", ratio === "1/1" ? "aspect-square" : "aspect-[4/5]")}>
          <div className="absolute inset-0">
            <MediaSlot image={p.front} fit="contain" sizes={sizes} className="h-full w-full" label={`${p.name} vista principal`} />
          </div>
          <div className="absolute inset-0">
            <MediaSlot image={p.back ?? p.front} fit="contain" sizes={sizes} className="h-full w-full" label={`${p.name} segunda vista`} />
          </div>
          <StatusBadge status={p.status} className="absolute left-3 top-3" />
        </div>
        <div className="flex flex-col gap-1.5 pt-[22px]">
          {/* Marca como antetítulo: con casas de nombre largo el modelo sigue cabiendo en una o dos líneas. */}
          <span className="text-label uppercase text-ink-2">{p.brand}</span>
          <h3 className="m-0 text-h3 uppercase transition-colors group-hover:text-accent">{p.model}</h3>
          <span className="text-meta text-ink-2">{p.subtitle}</span>
          <Price formatted={p.price.formatted} from={p.priceFrom} className="pt-1.5" />
        </div>
      </Link>
      {actions && (
        <div className="flex gap-2.5 pt-[18px]">
          {quick ? (
            <AddToCartButton
              className="flex-1"
              testId={`add-${p.slug}`}
              item={{ productId: p.id, variantId: quick.id, variantLabel: quick.label, kind: p.kind, slug: p.slug, name: p.name, subtitle: p.subtitle, priceCents: p.price.cents, quantity: 1, maxQuantity: quick.maxQuantity }}
            />
          ) : p.purchasable ? (
            <Button href={href} size="sm" className="flex-1" data-testid={`options-${p.slug}`}>
              Ver opciones
            </Button>
          ) : (
            <AddToCartButton className="flex-1" testId={`add-${p.slug}`} item={null} label={p.status.label} />
          )}
          {!(p.purchasable && !quick) && (
            <Button href={href} variant="ghost" size="sm" aria-label={`Ver pieza: ${p.name}`} data-testid={`view-${p.slug}`}>
              Ver pieza
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
