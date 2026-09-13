"use client";
import type { WatchSummaryDto } from "@/application/dto/watch.dto";
import { useCart } from "@/presentation/hooks/use-cart";
import { Button } from "@/presentation/components/primitives/Button";

export function AddToCartButton({ watch, size = "sm", className }: { watch: WatchSummaryDto; size?: "sm" | "md" | "lg"; className?: string }) {
  const cart = useCart();
  const disabled = watch.availability !== "disponible";
  return (
    <Button
      size={size}
      className={className}
      disabled={disabled}
      data-testid={`add-${watch.slug}`}
      onClick={() =>
        cart.add({ watchId: watch.id, slug: watch.slug, name: watch.name, subtitle: watch.subtitle, priceCents: watch.price.cents })
      }
    >
      {disabled ? (watch.availability === "reservado" ? "Reservado" : "Vendido") : "Añadir a la bolsa"}
    </Button>
  );
}
