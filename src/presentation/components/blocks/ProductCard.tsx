import Link from "next/link";
import type { WatchSummaryDto } from "@/application/dto/watch.dto";
import { MediaSlot } from "@/presentation/components/primitives/MediaSlot";
import { Price } from "@/presentation/components/primitives/Price";
import { Button } from "@/presentation/components/primitives/Button";
import { ROUTES } from "@/presentation/lib/site";
import { cn } from "@/presentation/lib/cn";
import { AddToCartButton } from "./AddToCartButton";

export interface ProductCardItem {
  watch: WatchSummaryDto;
  whatsappUrl: string | null;
}

export function ProductCard({ item, ratio, sizes, actions }: { item: ProductCardItem; ratio: "1/1" | "4/5"; sizes: string; actions: boolean }) {
  const { watch, whatsappUrl } = item;
  const href = ROUTES.watch(watch.slug);
  return (
    <article className="flex flex-col" data-reveal="1" data-testid="product-card">
      <Link href={href} className="block">
        <div className={cn("nn-swap relative overflow-hidden bg-surface", ratio === "1/1" ? "aspect-square" : "aspect-[4/5]")}>
          <div className="absolute inset-0">
            <MediaSlot image={watch.front} fit="contain" sizes={sizes} className="h-full w-full" label={`${watch.name} vista frontal`} />
          </div>
          <div className="absolute inset-0">
            <MediaSlot image={watch.back} fit="contain" sizes={sizes} className="h-full w-full" label={`${watch.name} vista trasera`} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 pt-[22px]">
          <h3 className="m-0 text-h3 uppercase">{watch.name}</h3>
          <span className="text-meta text-ink-2">{watch.subtitle}</span>
          <Price formatted={watch.price.formatted} className="pt-1.5" />
        </div>
      </Link>
      {actions && (
        <div className="flex gap-2.5 pt-[18px]">
          <AddToCartButton watch={watch} className="flex-1" />
          {whatsappUrl ? (
            <Button href={whatsappUrl} variant="ghost" size="sm" target="_blank" rel="noopener noreferrer" aria-label={`Consultar ${watch.name} por WhatsApp`}>
              WhatsApp
            </Button>
          ) : (
            <Button variant="ghost" size="sm" disabled title="Número de WhatsApp pendiente">
              WhatsApp
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
