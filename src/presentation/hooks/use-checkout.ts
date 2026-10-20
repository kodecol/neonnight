"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { track } from "@/presentation/analytics/track";
import type { CartItem } from "./use-cart";

export const toTrackItem = (i: CartItem) => ({ id: i.productId, name: i.name, variant: i.variantLabel || undefined, priceCents: i.priceCents, quantity: i.quantity });

/**
 * Inicia el pago de unas líneas: POST /api/checkout (el servidor recalcula
 * precio y disponibilidad) y redirige a la pasarela. Lo usan la bolsa y
 * "Comprar ahora" de la ficha.
 */
export function useCheckout() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (items: CartItem[], onSuccess?: () => void) => {
      if (items.length === 0) return;
      setSubmitting(true);
      setError(null);
      const totalCents = items.reduce((n, i) => n + i.priceCents * i.quantity, 0);
      track({ name: "begin_checkout", items: items.map(toTrackItem), valueCents: totalCents });
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            lines: items.map((i) => ({ productId: i.productId, variantId: i.variantId || undefined, quantity: i.quantity })),
            expectedTotalCents: totalCents,
          }),
        });
        const data = (await res.json()) as { redirectUrl?: string; error?: string };
        if (!res.ok || !data.redirectUrl) throw new Error(data.error ?? "No se pudo iniciar el pago.");
        onSuccess?.();
        // La pasarela (checkout.bold.co) es otro origen: navegación completa.
        const target = new URL(data.redirectUrl, window.location.href);
        if (target.origin === window.location.origin) router.push(`${target.pathname}${target.search}`);
        else window.location.assign(target.toString());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado.");
      } finally {
        setSubmitting(false);
      }
    },
    [router],
  );

  return { start, submitting, error };
}
