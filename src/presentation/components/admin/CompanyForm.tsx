"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { CompanyInput } from "@/application/dto/legal.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { cn } from "@/presentation/lib/cn";
import { TextInput } from "./fields";

/**
 * Identidad del vendedor (Ley 1480, art. 50). Llega al pie de página, a los
 * datos para Google y a las páginas legales mediante las fichas {empresa},
 * {correo}…, así que un cambio aquí se refleja en todas.
 */
export function CompanyForm({ initial, save }: { initial: CompanyInput; save: (input: CompanyInput) => Promise<ActionResult> }) {
  const router = useRouter();
  const [draft, setDraft] = useState<CompanyInput>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== saved;
  const set = <K extends keyof CompanyInput>(k: K, v: CompanyInput[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setMessage(null);
  };
  const field = (k: keyof CompanyInput, label: string, extra: { placeholder?: string; hint?: string; type?: string } = {}) => (
    <TextInput label={label} value={draft[k] ?? ""} onChange={(e) => set(k, e.target.value)} error={errors[k]} {...extra} />
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await save(draft);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage({ text: res.error, error: true });
        return;
      }
      setErrors({});
      setSaved(JSON.stringify(draft));
      setMessage({ text: "Guardado · ya se ve en la tienda", error: false });
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8" data-testid="company-form">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {field("tradeName", "Nombre comercial")}
        {field("legalForm", "Naturaleza", { placeholder: "Establecimiento de comercio" })}
        {field("registryNumber", "Matrícula mercantil")}
        {field("chamber", "Cámara de comercio")}
        {field("ownerName", "Propietario", { hint: "Opcional. Con su documento, aparece como responsable de los datos." })}
        {field("ownerTaxId", "NIT o cédula del propietario")}
        {field("city", "Ciudad")}
        {field("region", "Departamento")}
        {field("hours", "Horario de atención")}
        {field("email", "Correo de atención", { type: "email" })}
        {field("privacyEmail", "Correo para datos personales", { type: "email", hint: "Canal de consultas y reclamos de la Ley 1581." })}
      </div>
      <div className="flex flex-col gap-6 border-t border-divider pt-6">
        <span className="text-label uppercase text-ink-2">Envíos</span>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {field("carrier", "Transportadora", { hint: "Aparece en la home, en Envíos y en las páginas legales." })}
          {field("trackingUrl", "Página de rastreo", { placeholder: "https://…", hint: "Donde el cliente consulta su guía." })}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-divider pt-6">
        <p className={cn("m-0 text-label-sm uppercase", message?.error ? "text-accent" : message ? "text-ink" : dirty ? "text-ink-2" : "text-ink-3")} role="status" aria-live="polite">
          {message?.text ?? (dirty ? "Cambios sin guardar" : "Sin cambios")}
        </p>
        <Button type="submit" size="sm" disabled={pending || !dirty} data-testid="save-company">
          {pending ? "Guardando…" : "Guardar datos"}
        </Button>
      </div>
    </form>
  );
}
