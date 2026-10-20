"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/presentation/hooks/use-cart";
import { useBodyLock } from "@/presentation/hooks/use-body-lock";
import { formatCop } from "@/presentation/lib/format-money";
import { Button } from "@/presentation/components/primitives/Button";
import type { SiteContent } from "@/application/dto/site-content.dto";
import { fill } from "@/application/lib/template";

/**
 * Drawer derecho de la bolsa. El total mostrado es informativo: al finalizar,
 * POST /api/checkout recalcula precio y disponibilidad en el servidor.
 */
export function CartDrawer({
  whatsappNumberConfigured,
  whatsappBase,
  content,
}: {
  whatsappNumberConfigured: boolean;
  whatsappBase: string | null;
  content: SiteContent["cart"];
}) {
  const cart = useCart();
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useBodyLock(cart.isOpen);

  useEffect(() => {
    if (cart.isOpen) panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
  }, [cart.isOpen]);

  if (!cart.isOpen) return null;

  const whatsappHref =
    whatsappBase && cart.items.length > 0
      ? `${whatsappBase}?text=${encodeURIComponent(
          fill(content.whatsappMessageTemplate, { items: cart.items.map((i) => i.name).join(", "), total: formatCop(cart.totalCents) }),
        )}`
      : null;

  async function checkout() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: cart.items.map((i) => ({ watchId: i.watchId, quantity: 1 })),
          expectedTotalCents: cart.totalCents,
        }),
      });
      const data = (await res.json()) as { redirectUrl?: string; error?: string };
      if (!res.ok || !data.redirectUrl) throw new Error(data.error ?? "No se pudo iniciar el checkout.");
      cart.clear();
      cart.close();
      // La pasarela (checkout.bold.co) es otro origen: navegación completa.
      const target = new URL(data.redirectUrl, window.location.href);
      if (target.origin === window.location.origin) router.push(`${target.pathname}${target.search}`);
      else window.location.assign(target.toString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="backdrop-glass fixed inset-0 z-[70] flex justify-end bg-scrim" onClick={cart.close} data-testid="cart-overlay">
      <aside
        id="cart-drawer"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={content.title}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[480px] flex-col border-l border-divider bg-surface-elevated px-6 pb-10 pt-[100px] md:px-10"
      >
        <div className="mb-7 flex items-center justify-between">
          <h2 className="m-0 text-h3 uppercase tracking-[-0.3px]">{content.title}</h2>
          <button type="button" onClick={cart.close} className="cursor-pointer border-0 bg-transparent p-0 text-label uppercase text-ink-2 hover:text-ink" aria-label="Cerrar la bolsa">
            {content.close}
          </button>
        </div>

        <ul className="m-0 flex flex-1 list-none flex-col overflow-auto p-0" data-testid="cart-lines">
          {cart.items.map((line) => (
            <li key={line.watchId} className="flex justify-between gap-5 border-b border-divider py-5">
              <div className="flex flex-col gap-1.5">
                <span className="text-small font-medium uppercase">{line.name}</span>
                <span className="text-legal text-ink-2">{line.subtitle}</span>
                <button type="button" onClick={() => cart.remove(line.watchId)} className="mt-1 w-fit cursor-pointer border-0 bg-transparent p-0 text-left text-label-sm uppercase text-ink-3 hover:text-ink">
                  {content.remove}
                </button>
              </div>
              <span className="whitespace-nowrap text-[14px]">{formatCop(line.priceCents)}</span>
            </li>
          ))}
          {cart.items.length === 0 && <li className="py-2 text-small text-ink-3">{content.empty}</li>}
        </ul>

        <div className="flex justify-between border-t border-divider py-6 text-small">
          <span className="text-ink-2">{content.total}</span>
          <span data-testid="cart-total">{formatCop(cart.totalCents)}</span>
        </div>

        {error && (
          <p role="alert" className="mb-3 text-legal text-accent">
            {error}
          </p>
        )}
        <Button onClick={checkout} disabled={cart.items.length === 0 || submitting} className="w-full justify-start px-6 py-5 text-label-lg" data-testid="checkout-button">
          {submitting ? "Procesando…" : content.checkout}
        </Button>
        {whatsappHref ? (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="block pt-[18px] text-label-lg uppercase text-ink-2 hover:text-ink">
            {content.whatsapp}
          </a>
        ) : (
          <span className="block pt-[18px] text-label-lg uppercase text-ink-3">{whatsappNumberConfigured ? content.whatsapp : content.whatsappPending}</span>
        )}
      </aside>
    </div>
  );
}
