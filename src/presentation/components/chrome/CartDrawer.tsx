"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { cartKey, useCart } from "@/presentation/hooks/use-cart";
import { useCheckout } from "@/presentation/hooks/use-checkout";
import { RichText } from "@/presentation/components/primitives/RichText";
import { useBodyLock } from "@/presentation/hooks/use-body-lock";
import { formatCop } from "@/presentation/lib/format-money";
import { Button } from "@/presentation/components/primitives/Button";
import { QuantityStepper } from "@/presentation/components/primitives/QuantityStepper";
import { ROUTES } from "@/presentation/lib/site";
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
  const { start, submitting, error } = useCheckout();
  const panelRef = useRef<HTMLElement>(null);
  useBodyLock(cart.isOpen);

  useEffect(() => {
    if (cart.isOpen) panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
  }, [cart.isOpen]);

  if (!cart.isOpen) return null;

  const whatsappHref =
    whatsappBase && cart.items.length > 0
      ? `${whatsappBase}?text=${encodeURIComponent(
          fill(content.whatsappMessageTemplate, {
            items: cart.items.map((i) => [i.quantity > 1 ? `${i.quantity} × ` : "", i.name, i.variantLabel ? ` (${i.variantLabel})` : ""].join("")).join(", "),
            total: formatCop(cart.totalCents),
          }),
        )}`
      : null;

  const checkout = () =>
    start(cart.items, () => {
      cart.clear();
      cart.close();
    });

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
          {cart.items.map((line) => {
            const key = cartKey(line);
            return (
              <li key={key} className="flex justify-between gap-5 border-b border-divider py-5">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Link href={ROUTES.product(line.kind, line.slug)} onClick={cart.close} className="text-small font-medium uppercase hover:text-accent">
                    {line.name}
                  </Link>
                  <span className="text-legal text-ink-2">{[line.variantLabel, line.subtitle].filter(Boolean).join(" · ")}</span>
                  <div className="mt-2 flex items-center gap-5">
                    {line.maxQuantity > 1 && (
                      <QuantityStepper size="sm" value={line.quantity} max={line.maxQuantity} onChange={(q) => cart.setQuantity(key, q)} label={`Cantidad de ${line.name}`} />
                    )}
                    <button type="button" onClick={() => cart.remove(key)} className="w-fit cursor-pointer border-0 bg-transparent p-0 text-left text-label-sm uppercase text-ink-3 hover:text-ink">
                      {content.remove}
                    </button>
                  </div>
                </div>
                <span className="whitespace-nowrap text-[14px] tabular-nums">{formatCop(line.priceCents * line.quantity)}</span>
              </li>
            );
          })}
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
        <p
          className="mb-0 mt-3.5 text-legal text-ink-3 [text-wrap:pretty]"
          data-testid="cart-legal"
          // Al abrir una página legal la bolsa se cierra para que se vea.
          onClick={(e) => (e.target as Element).closest("a") && cart.close()}
        >
          <RichText text={content.legalNote} linkClassName="text-ink-2" />
        </p>
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
