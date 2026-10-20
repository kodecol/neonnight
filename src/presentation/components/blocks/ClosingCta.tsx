"use client";
import { useState } from "react";
import type { ProductDetailDto } from "@/application/dto/product.dto";
import type { SiteContent } from "@/application/dto/site-content.dto";
import { fill } from "@/application/lib/template";
import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { Price } from "@/presentation/components/primitives/Price";
import { QuantityStepper } from "@/presentation/components/primitives/QuantityStepper";
import { cn } from "@/presentation/lib/cn";
import { AddToCartButton } from "./AddToCartButton";

type Content = SiteContent["product"]["purchase"];

/**
 * Cierre de compra: presentación (si hay varias), cantidad (si se vende por
 * unidades) y CTA. Precio y stock siguen a la opción elegida; el servidor los
 * vuelve a validar al pagar.
 */
export function ClosingCta({
  product,
  whatsappUrl,
  content,
  variantLabel,
}: {
  product: ProductDetailDto;
  whatsappUrl: string | null;
  content: Content;
  variantLabel: string;
}) {
  const initial = product.variants.find((v) => v.purchasable) ?? product.variants[0]!;
  const [variantId, setVariantId] = useState(initial.id);
  const [quantity, setQuantity] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId) ?? initial;
  const multi = product.variants.length > 1;
  const canBuy = variant.purchasable && variant.maxQuantity > 0;
  const lowStock = product.saleMode === "unidades" && canBuy && variant.stock <= 3;

  const choose = (id: string) => {
    setVariantId(id);
    setQuantity(1);
  };

  return (
    <section id="compra" className="grid grid-cols-1 items-end gap-10 px-page py-section lg:grid-cols-[1fr_auto] lg:gap-[60px]" data-reveal="1">
      <div>
        <Kicker className={cn(lowStock && "text-accent")}>{lowStock ? fill(content.lowStockTemplate, { count: variant.stock }) : product.status.label}</Kicker>
        <h2 className="mb-3 mt-4 text-h2-fluid uppercase">{product.name}</h2>
        <Price formatted={variant.price.formatted} className="text-lead" />
        {multi && (
          <fieldset className="m-0 mt-9 border-0 p-0">
            <legend className="mb-4 p-0 text-kicker uppercase text-ink-2">{variantLabel}</legend>
            <div className="flex flex-wrap gap-3" data-testid="variant-picker">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={v.id === variantId}
                  onClick={() => choose(v.id)}
                  className={cn(
                    "flex cursor-pointer flex-col items-start gap-1 border px-5 py-3 text-left transition-colors",
                    v.id === variantId ? "border-ink text-ink" : "border-border text-ink-2 hover:border-ink hover:text-ink",
                    !v.purchasable && "opacity-50",
                  )}
                >
                  <span className={cn("text-label uppercase", !v.purchasable && "line-through")}>{v.label}</span>
                  <span className="text-legal tabular-nums text-ink-2">{v.purchasable ? v.price.formatted : product.status.code === "disponible" || product.status.code === "ultimas" ? "Agotado" : product.status.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3.5">
        {canBuy && variant.maxQuantity > 1 && <QuantityStepper value={quantity} max={variant.maxQuantity} onChange={setQuantity} label={content.quantity} />}
        <AddToCartButton
          size="lg"
          testId={`add-${product.slug}`}
          label={canBuy ? content.add : multi ? "Agotado" : product.status.label}
          item={
            canBuy
              ? {
                  productId: product.id,
                  variantId: variant.id,
                  variantLabel: variant.label,
                  kind: product.kind,
                  slug: product.slug,
                  name: product.name,
                  subtitle: product.subtitle,
                  priceCents: variant.price.cents,
                  quantity,
                  maxQuantity: variant.maxQuantity,
                }
              : null
          }
        />
        {whatsappUrl ? (
          <Button href={whatsappUrl} variant="secondary" size="lg" target="_blank" rel="noopener noreferrer" data-testid="whatsapp-cta">
            {content.whatsapp}
          </Button>
        ) : (
          <Button variant="secondary" size="lg" disabled title="Número de WhatsApp pendiente">
            {content.whatsapp}
          </Button>
        )}
      </div>
    </section>
  );
}
