"use client";
import { useState, useTransition } from "react";
import type { ActionResult, PaymentSettingsInput, PaymentSettingsViewDto } from "@/application/dto/admin.dto";
import type { PaymentMode } from "@/application/ports/payment-settings";
import { Button } from "@/presentation/components/primitives/Button";
import { cn } from "@/presentation/lib/cn";
import { Segmented, TextArea, TextInput, Toggle } from "./fields";

const MODES = [
  { value: "pruebas", label: "Pruebas" },
  { value: "produccion", label: "Producción" },
] as const satisfies ReadonlyArray<{ value: PaymentMode; label: string }>;

export function PaymentSettingsForm({
  initial,
  webhookUrl,
  save,
}: {
  initial: PaymentSettingsViewDto;
  webhookUrl: string;
  save: (input: PaymentSettingsInput) => Promise<ActionResult<PaymentSettingsViewDto>>;
}) {
  const [view, setView] = useState(initial);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [mode, setMode] = useState<PaymentMode>(initial.mode);
  const [identityKey, setIdentityKey] = useState(initial.identityKey);
  const [secretKey, setSecretKey] = useState("");
  const [manualEnabled, setManualEnabled] = useState(initial.manualEnabled);
  const [manualInstructions, setManualInstructions] = useState(initial.manualInstructions);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const dirty =
    enabled !== view.enabled ||
    mode !== view.mode ||
    identityKey !== view.identityKey ||
    secretKey !== "" ||
    manualEnabled !== view.manualEnabled ||
    manualInstructions !== view.manualInstructions;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await save({ enabled, mode, identityKey, secretKey, manualEnabled, manualInstructions });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage({ ok: false, text: res.error });
        return;
      }
      setErrors({});
      setView(res.data);
      setSecretKey("");
      setMessage({ ok: true, text: "Configuración guardada." });
    });
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-x-14 gap-y-12 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0">
        <StatusPanel view={view} />

        <form onSubmit={onSubmit} noValidate className="mt-12 border-t border-divider pt-8">
          <div className="grid max-w-[640px] gap-8">
            <Toggle
              label="Cobrar con Bold"
              description="Al pagar, el cliente pasa a la pasarela de Bold. Desactivado, rige lo que configures abajo en «Sin pasarela»."
              checked={enabled}
              onChange={(v) => {
                setEnabled(v);
                setMessage(null);
              }}
            />
            <Segmented label="Ambiente" value={mode} options={MODES} onChange={setMode} />
            <TextInput
              label="Llave de identidad"
              value={identityKey}
              onChange={(e) => setIdentityKey(e.target.value.trim())}
              error={errors.identityKey}
              autoComplete="off"
              spellCheck={false}
              placeholder="Llave pública del comercio"
              hint={mode === "pruebas" ? "Usa la llave de identidad de pruebas." : "Usa la llave de identidad de producción."}
            />
            <TextInput
              label="Llave secreta"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value.trim())}
              error={errors.secretKey}
              autoComplete="new-password"
              spellCheck={false}
              placeholder={view.secretKeyHint ? `${view.secretKeyHint} guardada — escribe para reemplazar` : "Llave secreta del comercio"}
              hint={
                mode === "pruebas"
                  ? "Opcional en pruebas: Bold firma los webhooks de prueba con una llave vacía."
                  : "Se guarda cifrada y nunca se muestra completa. Verifica la firma de los webhooks."
              }
            />
            <div className="grid gap-6 border-t border-divider pt-8">
              <Toggle
                label="Sin pasarela: recibir el pedido y coordinar el pago"
                description="Cuando Bold está inactivo. Activado, el pedido se registra con los datos del cliente y en la página de confirmación ve estas instrucciones y un botón de WhatsApp. Apagado, el checkout avisa que por ahora no se reciben pagos en línea."
                checked={manualEnabled}
                onChange={(v) => {
                  setManualEnabled(v);
                  setMessage(null);
                }}
              />
              {manualEnabled && (
                <TextArea
                  label="Instrucciones para el cliente"
                  rows={4}
                  value={manualInstructions}
                  onChange={(e) => setManualInstructions(e.target.value)}
                  maxLength={600}
                  error={errors.manualInstructions}
                  hint="Se muestran en la confirmación del pedido (transferencia, contacto, tiempos)."
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <Button type="submit" disabled={pending || !dirty}>
                {pending ? "Guardando…" : "Guardar configuración"}
              </Button>
              {message && (
                <p role="status" className={cn("m-0 text-label-sm uppercase", message.ok ? "text-ink" : "text-accent")}>
                  {message.text}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      <aside className="self-start xl:sticky xl:top-10">
        <WebhookCard url={webhookUrl} />
      </aside>
    </div>
  );
}

function StatusPanel({ view }: { view: PaymentSettingsViewDto }) {
  const live = view.ready;
  return (
    <div className="grid gap-px border border-divider bg-divider md:grid-cols-3">
      <Stat label="Pasarela" value="Bold" />
      <Stat
        label="Estado"
        value={
          <span className="flex items-center gap-3">
            <span className={cn("h-2 w-2", live ? "bg-accent" : "bg-ink-3")} aria-hidden="true" />
            {live ? "Activo" : view.enabled ? "Incompleto" : "Inactivo"}
          </span>
        }
      />
      <Stat label="Ambiente" value={view.mode === "produccion" ? "Producción" : "Pruebas"} />
      {view.updatedAt && (
        <p className="m-0 bg-bg px-6 py-3 text-legal text-ink-3 md:col-span-3">
          Última modificación {new Date(view.updatedAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-bg px-6 py-6">
      <span className="block text-label-sm uppercase text-ink-3">{label}</span>
      <span className="mt-3 block text-h3 uppercase text-ink">{value}</span>
    </div>
  );
}

function WebhookCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="border border-divider bg-surface-elevated p-7">
      <span className="block text-kicker uppercase text-ink-2">Webhook</span>
      <p className="m-0 mt-4 text-small text-ink-2">Bold avisa aquí cada pago aprobado o rechazado. Con el aviso, la orden queda pagada y la pieza pasa a vendida.</p>
      <div className="mt-6 flex border border-border">
        <code className="min-w-0 flex-1 truncate px-4 py-3.5 font-sans text-small text-ink" title={url}>
          {url}
        </code>
        <button type="button" onClick={copy} className="cursor-pointer border-l border-border px-4 text-label-sm uppercase text-ink-2 transition-colors hover:text-ink">
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <ol className="m-0 mt-8 grid list-none gap-5 p-0">
        {[
          "En el panel de Bold abre Integraciones y copia las llaves del ambiente que vas a usar.",
          "En Webhooks registra esta URL y activa los eventos de venta aprobada y rechazada.",
          "Guarda las llaves aquí, activa el cobro y haz una compra en Pruebas antes de pasar a Producción.",
        ].map((step, i) => (
          <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] text-small text-ink-2">
            <span className="text-label-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
