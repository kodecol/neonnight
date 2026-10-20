"use client";
import { useCart, type CartItem } from "@/presentation/hooks/use-cart";
import { Button } from "@/presentation/components/primitives/Button";

/** Añade `item` a la bolsa; sin item (agotado, reservado o sin opción elegida) queda desactivado con `label`. */
export function AddToCartButton({
  item,
  label = "Añadir a la bolsa",
  size = "sm",
  className,
  testId,
}: {
  item: CartItem | null;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  testId: string;
}) {
  const cart = useCart();
  return (
    <Button size={size} className={className} disabled={!item} data-testid={testId} onClick={() => item && cart.add(item)}>
      {label}
    </Button>
  );
}
