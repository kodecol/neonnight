"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEPARTMENTS, DOCUMENT_LABEL, type CheckoutQuoteDto, type LegalVersions } from "@/application/dto/checkout.dto";
import type { PaymentLogo } from "@/application/dto/site-content.dto";
import { cartKey, useCart } from "@/presentation/hooks/use-cart";
import { track } from "@/presentation/analytics/track";
import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { QuantityStepper } from "@/presentation/components/primitives/QuantityStepper";
import { SelectMenu } from "@/presentation/components/primitives/SelectMenu";
import { forgetCustomer, loadSavedCustomer, saveCustomer } from "@/presentation/lib/saved-customer";
import { ROUTES } from "@/presentation/lib/site";
import { cn } from "@/presentation/lib/cn";

type PaymentMode = "bold" | "manual" | "unavailable";

interface Customer {
  name: string;
  documentType: keyof typeof DOCUMENT_LABEL;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  notes: string;
}

const withoutKey = (o: Record<string, string>, key: string) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== key));

const EMPTY: Customer = { name: "", documentType: "CC", documentNumber: "", email: "", phone: "", address: "", city: "", department: "", notes: "" };

const DOCUMENT_OPTIONS = Object.entries(DOCUMENT_LABEL).map(([value, label]) => ({ value, label }));
const DEPARTMENT_OPTIONS = DEPARTMENTS.map((d) => ({ value: d, label: d }));

const control = "block w-full border bg-transparent px-4 py-3.5 text-meta text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink";

/** `id`: base de los ids del error y la ayuda, a los que apunta el `aria-describedby` del control. */
function Field({ label, error, children, className, hint, id }: { label: string; error?: string; children: ReactNode; className?: string; hint?: string; id?: string }) {
  return (
    <label className={cn("flex flex-col gap-2.5", className)}>
      <span className="text-label uppercase text-ink-2">{label}</span>
      {children}
      {error ? (
        <span id={id && `${id}-error`} className="text-label-sm uppercase text-accent">
          {error}
        </span>
      ) : hint ? (
        <span id={id && `${id}-hint`} className="text-legal text-ink-3">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/**
 * Checkout de la tienda: resumen verificado en el servidor, datos del
 * comprador, aceptación de términos y privacidad (versión vigente) y pago.
 * Bold si está activo; si no, pedido manual o un aviso (panel › Pagos).
 */
export function CheckoutView({
  mode,
  legal,
  logos,
  whatsappUrl,
  privacyEmail,
  reassurance,
}: {
  mode: PaymentMode;
  legal: LegalVersions;
  logos: PaymentLogo[];
  whatsappUrl: string | null;
  privacyEmail: string;
  /** "Envío asegurado sin costo · 10 días para devolver · Garantía de 12 meses" (de las políticas). */
  reassurance: string;
}) {
  const cart = useCart();
  const [quote, setQuote] = useState<CheckoutQuoteDto | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer>(EMPTY);
  const [accepted, setAccepted] = useState(false);
  // "Recordar mis datos": solo en este navegador (localStorage), y solo si el comprador lo marca.
  const [remember, setRemember] = useState(false);
  const [usingSaved, setUsingSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Sube tras un rechazo: el foco va al primer campo marcado (un solo aviso, el resumen).
  const [focusInvalid, setFocusInvalid] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    const saved = loadSavedCustomer();
    if (!saved) return;
    setCustomer((c) => ({ ...c, ...saved }));
    setRemember(true);
    setUsingSaved(true);
  }, []);

  const forget = () => {
    forgetCustomer();
    setCustomer(EMPTY);
    setRemember(false);
    setUsingSaved(false);
  };

  useEffect(() => {
    if (focusInvalid) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusInvalid]);

  const lines = useMemo(() => cart.items.map((i) => ({ productId: i.productId, variantId: i.variantId || undefined, quantity: i.quantity })), [cart.items]);
  const linesKey = JSON.stringify(lines);

  // Precios, stock y envío salen del servidor cada vez que cambia la bolsa.
  useEffect(() => {
    if (!cart.hydrated) return;
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    const ctrl = new AbortController();
    fetch("/api/checkout/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines }), signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const q = (await r.json()) as CheckoutQuoteDto;
        setQuote(q);
        setQuoteError(null);
        if (!tracked.current) {
          tracked.current = true;
          track({ name: "begin_checkout", items: q.lines.map((l) => ({ id: l.productId, name: l.name, variant: l.variantLabel || undefined, priceCents: l.unitPrice.cents, quantity: l.quantity })), valueCents: q.total.cents });
        }
      })
      .catch((e: unknown) => {
        if ((e as Error)?.name !== "AbortError") setQuoteError("No pudimos verificar tu bolsa. Recarga la página.");
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.hydrated, linesKey]);

  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => {
    setCustomer((c) => ({ ...c, [k]: v }));
    setErrors((e) => withoutKey(e, `customer.${k}`));
  };
  const err = (k: string) => errors[`customer.${k}`];
  const consentError = errors["consent.accepted"] ?? errors.consent;
  /** Estado del control para lectores de pantalla: inválido y descrito por su error (o su ayuda). */
  const describe = (k: keyof Customer, hint = false) => {
    const e = err(k);
    return { "aria-invalid": e ? true : undefined, "aria-describedby": e ? `checkout-${k}-error` : hint ? `checkout-${k}-hint` : undefined };
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quote?.ready || mode === "unavailable") return;
    if (!accepted) {
      setErrors((x) => ({ ...x, "consent.accepted": "Debes aceptar los términos y la política de privacidad." }));
      setFocusInvalid((n) => n + 1);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines,
          expectedTotalCents: quote.total.cents,
          customer,
          consent: { accepted: true, termsVersion: legal.terms.version, privacyVersion: legal.privacy.version },
        }),
      });
      const data = (await res.json()) as { redirectUrl?: string; error?: string; fieldErrors?: Record<string, string> };
      if (!res.ok || !data.redirectUrl) {
        setErrors(data.fieldErrors ?? {});
        setFormError(data.error ?? "No se pudo registrar el pedido.");
        setFocusInvalid((n) => n + 1);
        return;
      }
      if (remember) saveCustomer(customer);
      else forgetCustomer();
      cart.clear();
      // La pasarela (checkout.bold.co) es otro origen: navegación completa.
      window.location.assign(data.redirectUrl);
    } catch {
      setFormError("Se perdió la conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.hydrated && cart.items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-6 py-10" data-testid="checkout-empty">
        <p className="m-0 text-lead text-ink-2">Tu bolsa está vacía.</p>
        <Button href={ROUTES.collection}>Ver la colección</Button>
      </div>
    );
  }

  const cta = mode === "bold" ? "Pagar con Bold" : "Confirmar pedido";

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-20" data-testid="checkout-form">
      <div className="flex min-w-0 flex-col gap-14">
        {mode === "unavailable" && (
          <p className="m-0 border-l-2 border-accent bg-surface px-5 py-4 text-small text-ink-2" role="status" data-testid="checkout-unavailable">
            Por ahora no recibimos pagos en línea.{" "}
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-ink underline decoration-accent underline-offset-4">
                Escríbenos por WhatsApp
              </a>
            ) : (
              "Escríbenos"
            )}{" "}
            y cerramos la compra contigo.
          </p>
        )}

        <fieldset className="m-0 grid gap-6 border-0 p-0 md:grid-cols-2">
          <legend className="mb-6 p-0 text-label-lg uppercase text-ink">
            <span className="mr-4 text-ink-3">01</span>Tus datos
          </legend>
          {usingSaved && (
            <p className="m-0 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-l-2 border-accent bg-surface px-5 py-3.5 text-small text-ink-2 md:col-span-2" role="status" data-testid="checkout-saved">
              Completamos tus datos guardados en este dispositivo.
              <button type="button" onClick={forget} className="cursor-pointer border-0 bg-transparent p-0 text-label-sm uppercase text-ink underline decoration-accent underline-offset-4 hover:text-accent" data-testid="checkout-forget">
                Olvidar mis datos
              </button>
            </p>
          )}
          <Field label="Nombre completo" error={err("name")} className="md:col-span-2" id="checkout-name">
            <input {...describe("name")} className={cn(control, err("name") ? "border-accent" : "border-border")} value={customer.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" required maxLength={80} />
          </Field>
          <Field label="Tipo de documento">
            <SelectMenu id="checkout-documentType" value={customer.documentType} options={DOCUMENT_OPTIONS} onChange={(v) => set("documentType", v as Customer["documentType"])} />
          </Field>
          <Field label="Número de documento" error={err("documentNumber")} hint="Para la factura y la entrega." id="checkout-documentNumber">
            <input {...describe("documentNumber", true)} className={cn(control, err("documentNumber") ? "border-accent" : "border-border")} value={customer.documentNumber} onChange={(e) => set("documentNumber", e.target.value)} inputMode={customer.documentType === "PP" ? "text" : "numeric"} maxLength={20} />
          </Field>
          <Field label="Correo" error={err("email")} id="checkout-email">
            <input {...describe("email")} className={cn(control, err("email") ? "border-accent" : "border-border")} type="email" value={customer.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" maxLength={120} />
          </Field>
          <Field label="Celular" error={err("phone")} hint="Te escribimos por WhatsApp para coordinar la entrega." id="checkout-phone">
            <input {...describe("phone", true)} className={cn(control, err("phone") ? "border-accent" : "border-border")} type="tel" value={customer.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel-national" placeholder="300 123 4567" maxLength={20} />
          </Field>
        </fieldset>

        <fieldset className="m-0 grid gap-6 border-0 p-0 md:grid-cols-2">
          <legend className="mb-6 p-0 text-label-lg uppercase text-ink">
            <span className="mr-4 text-ink-3">02</span>Entrega
          </legend>
          <Field label="Dirección" error={err("address")} className="md:col-span-2" id="checkout-address">
            <input {...describe("address")} className={cn(control, err("address") ? "border-accent" : "border-border")} value={customer.address} onChange={(e) => set("address", e.target.value)} autoComplete="street-address" placeholder="Calle, número, apartamento o torre" maxLength={120} />
          </Field>
          <Field label="Ciudad o municipio" error={err("city")} id="checkout-city">
            <input {...describe("city")} className={cn(control, err("city") ? "border-accent" : "border-border")} value={customer.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" maxLength={60} />
          </Field>
          <Field label="Departamento" error={err("department")} id="checkout-department">
            <SelectMenu
              id="checkout-department-input"
              searchable
              value={customer.department}
              options={DEPARTMENT_OPTIONS}
              onChange={(v) => set("department", v)}
              placeholder="Escribe o elige el departamento"
              invalid={!!err("department")}
              describedBy={describe("department")["aria-describedby"]}
              autoComplete="address-level1"
              name="department"
            />
          </Field>
          <Field label="Notas para la entrega (opcional)" className="md:col-span-2">
            <textarea className={cn(control, "border-border")} rows={3} value={customer.notes} onChange={(e) => set("notes", e.target.value)} maxLength={300} placeholder="Horario, portería, persona autorizada para recibir…" />
          </Field>
          <label className="flex cursor-pointer items-start gap-3.5 md:col-span-2" data-testid="checkout-remember">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-accent" />
            <span className="flex flex-col gap-1">
              <span className="text-small text-ink">Recordar mis datos en este dispositivo</span>
              <span className="text-legal text-ink-3 [text-wrap:pretty]">Para completarlos solos en tu próxima compra. Se guardan solo en este navegador, no en nuestros servidores; puedes borrarlos cuando quieras.</span>
            </span>
          </label>
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-6 border-0 p-0">
          <legend className="mb-6 p-0 text-label-lg uppercase text-ink">
            <span className="mr-4 text-ink-3">03</span>Pago
          </legend>
          <p className="m-0 text-small text-ink-2 [text-wrap:pretty]">
            {mode === "bold"
              ? "Pagas en la pasarela segura de Bold con tarjeta, PSE, Nequi o Botón Bancolombia. No vemos ni guardamos los datos de tu tarjeta."
              : mode === "manual"
                ? "Registramos tu pedido y te contactamos para confirmar la pieza y coordinar el pago. No se cobra nada en este paso."
                : "Los pagos en línea no están disponibles en este momento."}{" "}
            <Link href="/pagos" className="text-ink underline decoration-accent underline-offset-4">
              Cómo funcionan los pagos
            </Link>
          </p>
          {mode === "bold" && (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Medios de pago">
              {logos.map((l) => (
                <li key={l.name} className="border border-divider px-3 py-2 text-label-sm uppercase text-ink-2">
                  {l.name}
                </li>
              ))}
            </ul>
          )}
          <label className="flex cursor-pointer items-start gap-3.5" data-testid="checkout-consent">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => {
                setAccepted(e.target.checked);
                setErrors((x) => withoutKey(x, "consent.accepted"));
              }}
              aria-invalid={consentError ? true : undefined}
              aria-describedby={consentError ? "checkout-consent-error" : undefined}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-accent"
            />
            <span className="text-small text-ink-2 [text-wrap:pretty]">
              Acepto los{" "}
              <Link href="/terminos" target="_blank" className="text-ink underline decoration-accent underline-offset-4">
                términos y condiciones
              </Link>{" "}
              (versión {legal.terms.version}) y autorizo el tratamiento de mis datos según la{" "}
              <Link href="/privacidad" target="_blank" className="text-ink underline decoration-accent underline-offset-4">
                política de privacidad
              </Link>{" "}
              (versión {legal.privacy.version}), para procesar este pedido. Puedo consultar o pedir que borren mis datos escribiendo a {privacyEmail}.
            </span>
          </label>
          {consentError && (
            <p id="checkout-consent-error" className="m-0 text-label-sm uppercase text-accent">
              {consentError}
            </p>
          )}
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--spacing-header)+24px)] lg:self-start" aria-label="Resumen del pedido">
        <div className="border border-divider bg-surface-elevated p-6 md:p-8" data-testid="checkout-summary">
          <Kicker>Tu pedido</Kicker>
          {!quote && !quoteError && <p className="mb-0 mt-6 text-small text-ink-3">Verificando precios y disponibilidad…</p>}
          {quoteError && <p className="mb-0 mt-6 text-small text-accent">{quoteError}</p>}
          {quote && (
            <>
              <ul className="m-0 mt-6 flex list-none flex-col p-0">
                {quote.lines.map((l) => {
                  const item = cart.items.find((i) => i.productId === l.productId && (i.variantId || l.variantId) === l.variantId) ?? cart.items.find((i) => i.productId === l.productId);
                  return (
                    <li key={`${l.productId}:${l.variantId}`} className="flex flex-col gap-2 border-b border-divider py-4 first:pt-0">
                      <div className="flex justify-between gap-4">
                        <Link href={ROUTES.product(l.kind as never, l.slug)} className="text-small font-medium uppercase hover:text-accent">
                          {l.name}
                        </Link>
                        <span className="whitespace-nowrap text-small tabular-nums">{l.lineTotal.formatted}</span>
                      </div>
                      <span className="text-legal text-ink-2">{[l.variantLabel, l.quantity > 1 ? `${l.quantity} × ${l.unitPrice.formatted}` : null].filter(Boolean).join(" · ")}</span>
                      {item && item.maxQuantity > 1 && (
                        <QuantityStepper size="sm" value={item.quantity} max={Math.max(1, Math.min(item.maxQuantity, l.maxQuantity || 1))} onChange={(q) => cart.setQuantity(cartKey(item), q)} label={`Cantidad de ${l.name}`} />
                      )}
                      {l.problem && (
                        <p role="alert" className="m-0 flex flex-wrap items-center gap-3 text-legal text-accent">
                          {l.problem}
                          {item && (
                            <button type="button" onClick={() => cart.remove(cartKey(item))} className="cursor-pointer text-label-sm uppercase text-ink-2 underline hover:text-ink">
                              Quitar
                            </button>
                          )}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <dl className="m-0 mt-5 flex flex-col gap-2.5 text-small">
                <div className="flex justify-between">
                  <dt className="text-ink-2">Subtotal</dt>
                  <dd className="m-0 tabular-nums">{quote.subtotal.formatted}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Envío</dt>
                  <dd className="m-0">{quote.shipping.label}</dd>
                </div>
                <div className="mt-2 flex justify-between border-t border-divider pt-4 text-meta">
                  <dt>Total</dt>
                  <dd className="m-0 font-medium tabular-nums" data-testid="checkout-total">
                    {quote.total.formatted}
                  </dd>
                </div>
              </dl>
              <p className="mb-0 mt-2 text-legal text-ink-3">Precios en pesos colombianos con impuestos incluidos.</p>
            </>
          )}
          {formError && (
            <p role="alert" className="mb-0 mt-5 text-small text-accent" data-testid="checkout-error">
              {formError}
            </p>
          )}
          <Button type="submit" size="lg" className="mt-6 w-full justify-center" disabled={!quote?.ready || submitting || mode === "unavailable"} data-testid="checkout-submit">
            {submitting ? "Procesando…" : cta}
          </Button>
          <p className="mb-0 mt-4 text-legal text-ink-3">{reassurance}</p>
        </div>
      </aside>
    </form>
  );
}
