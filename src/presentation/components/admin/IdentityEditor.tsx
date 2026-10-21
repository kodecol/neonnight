"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { IdentityAsset, StoreIdentityInput } from "@/application/dto/identity.dto";
import type { IdentityEditorState } from "@/application/use-cases/admin/identity";
import { Button } from "@/presentation/components/primitives/Button";
import { Isotype, WideLogo } from "@/presentation/components/primitives/Isotype";
import { cn } from "@/presentation/lib/cn";
import { BusyOverlay, PlusIcon, measure, slotAction } from "./ImageField";
import { FormSection, TextArea, TextInput } from "./fields";

const PREVIEW_PATH = "/admin/vista-previa/identidad";
const ACCEPT = "image/svg+xml,image/png,image/webp,image/avif";
const formatDate = (iso: string) => new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });

type Status = { kind: "idle" } | { kind: "saved" } | { kind: "loaded"; label: string } | { kind: "error"; message: string };
type UploadAction = (fd: FormData) => Promise<ActionResult<{ src: string; ratio: number }>>;

/** Una imagen de identidad: subir (SVG o PNG/WebP/AVIF transparente), texto alternativo y quitar. */
function AssetField({
  label,
  hint,
  value,
  onChange,
  upload,
  wide,
  testId,
}: {
  label: string;
  hint: string;
  value: IdentityAsset | null;
  onChange: (next: IdentityAsset | null) => void;
  upload: UploadAction;
  wide?: boolean;
  testId: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      // El SVG se mide en el servidor (viewBox); las imágenes, aquí.
      const { width, height } = file.type === "image/svg+xml" ? { width: 1, height: 1 } : await measure(file);
      const fd = new FormData();
      fd.set("file", file);
      fd.set("width", String(width));
      fd.set("height", String(height));
      const res = await upload(fd);
      if (res.ok) onChange({ src: res.data.src, ratio: res.data.ratio, alt: value?.alt ?? "" });
      else setError(res.error);
    } catch {
      setError("No se pudo leer el archivo.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      <span className="text-label uppercase text-ink-2">{label}</span>
      <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void handle(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className={cn(
          "relative flex cursor-pointer items-center justify-center border bg-bg transition-colors hover:border-ink",
          wide ? "aspect-[3/1] max-w-[520px]" : "aspect-square max-w-[220px]",
          value ? "border-divider" : "border-dashed border-border",
        )}
        aria-label={value ? `Reemplazar ${label.toLowerCase()}` : `Subir ${label.toLowerCase()}`}
      >
        {busy ? (
          <BusyOverlay />
        ) : value ? (
          wide ? (
            <WideLogo asset={value} height={44} />
          ) : (
            <Isotype size={96} asset={value} />
          )
        ) : wide ? (
          <span className="flex flex-col items-center gap-2">
            <PlusIcon />
            <span className="text-label-sm uppercase text-ink-2">Subir</span>
          </span>
        ) : (
          // Sin isotipo propio se usa el del sitio: se muestra para que se vea qué hay hoy.
          <span className="flex flex-col items-center gap-3">
            <Isotype size={72} className="opacity-60" />
            <span className="text-label-sm uppercase text-ink-2">El del sitio · subir otro</span>
          </span>
        )}
      </button>
      <p className="m-0 text-legal text-ink-3">{hint}</p>
      {value && (
        <>
          <TextInput
            label="Texto alternativo"
            value={value.alt}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
            maxLength={120}
            placeholder="Por ejemplo: logo de la tienda"
          />
          <button type="button" onClick={() => onChange(null)} className={cn(slotAction, "w-fit hover:text-accent")}>
            Quitar (usar el del sitio)
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="m-0 text-label-sm uppercase text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Panel › Identidad: nombre, wordmark, frase, descripción para buscadores,
 * isotipo y logo horizontal. Igual que Inicio: "Vista previa" guarda un
 * borrador y abre la tienda con él; "Publicar" la lleva a la tienda; las
 * últimas publicaciones se pueden volver a cargar.
 */
export function IdentityEditor({
  initial,
  actions,
}: {
  initial: IdentityEditorState;
  actions: { save: (input: StoreIdentityInput, mode: "draft" | "publish") => Promise<ActionResult>; discard: () => Promise<ActionResult>; upload: UploadAction };
}) {
  const [draft, setDraft] = useState<StoreIdentityInput>(initial.input);
  const [saved, setSaved] = useState(() => JSON.stringify(initial.input));
  const [hasDraft, setHasDraft] = useState(initial.hasDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof StoreIdentityInput>(k: K, v: StoreIdentityInput[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setStatus({ kind: "idle" });
  };

  async function persist(mode: "draft" | "publish") {
    const res = await actions.save(draft, mode);
    if (!res.ok) {
      setErrors(res.fieldErrors ?? {});
      setStatus({ kind: "error", message: res.error });
      return false;
    }
    setErrors({});
    setSaved(JSON.stringify(draft));
    setHasDraft(mode === "draft");
    setStatus({ kind: mode === "draft" ? "idle" : "saved" });
    return true;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      await persist("publish");
    });
  }

  function onPreview() {
    // La pestaña se abre ya (si se abre después de esperar, el navegador la bloquea).
    const tab = window.open("about:blank", "_blank");
    start(async () => {
      const ok = await persist("draft");
      if (ok && tab) tab.location.href = `${PREVIEW_PATH}?t=${Date.now()}`;
      else tab?.close();
    });
  }

  function onDiscard() {
    if (!window.confirm("¿Descartar el borrador? El editor vuelve a lo publicado.")) return;
    start(async () => {
      const res = await actions.discard();
      if (!res.ok) return setStatus({ kind: "error", message: res.error });
      window.location.reload();
    });
  }

  const load = (input: StoreIdentityInput, label: string) => {
    if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Cargar de todos modos?")) return;
    setDraft(input);
    setErrors({});
    setStatus({ kind: "loaded", label });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const err = (k: string) => errors[k];
  const [text, tone] = pending
    ? ["Guardando…", "text-ink-2"]
    : status.kind === "error"
      ? [status.message, "text-accent"]
      : status.kind === "loaded"
        ? [`${status.label} cargada · revisa y publica`, "text-ink-2"]
        : dirty
          ? ["Cambios sin guardar", "text-ink-2"]
          : hasDraft
            ? ["Borrador sin publicar", "text-ink-2"]
            : status.kind === "saved"
              ? ["Publicado en la tienda", "text-ink"]
              : ["Publicado · sin cambios", "text-ink-3"];

  return (
    <form onSubmit={onSubmit} noValidate className="pb-24" data-testid="identity-editor">
      <FormSection n="01" title="Nombre y textos" aside={<span className="text-legal text-ink-3">Títulos, buscadores, pie de página y mensajes</span>}>
        <div className="grid gap-6 md:grid-cols-2">
          <TextInput label="Nombre de la tienda" value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={40} error={err("name")} data-testid="identity-name" hint="Así aparece en los títulos de las páginas y en Google." />
          <TextInput label="Wordmark" value={draft.wordmark} onChange={(e) => set("wordmark", e.target.value)} maxLength={40} error={err("wordmark")} data-testid="identity-wordmark" hint="Junto al isotipo, en mayúsculas." />
          <TextArea className="md:col-span-2" rows={2} label="Frase" value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={160} error={err("tagline")} hint="Bajo el título de la portada y en el pie de página." />
          <TextInput
            className="md:col-span-2"
            label="Título para buscadores"
            value={draft.titleSuffix ?? ""}
            onChange={(e) => set("titleSuffix", e.target.value || undefined)}
            maxLength={60}
            error={err("titleSuffix")}
            hint={`Sigue al nombre en el título de la portada: «${draft.name || "Tu tienda"} — ${draft.titleSuffix || "…"}».`}
          />
          <TextArea className="md:col-span-2" rows={3} label="Descripción para buscadores" value={draft.description} onChange={(e) => set("description", e.target.value)} maxLength={200} error={err("description")} hint={`${draft.description.length}/200 · la que muestran Google y las vistas previas al compartir.`} />
        </div>
      </FormSection>

      <FormSection n="02" title="Isotipo y logo" aside={<span className="text-legal text-ink-3">SVG o PNG/WebP con fondo transparente, para fondo negro</span>}>
        <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
          <AssetField label="Isotipo" hint="Cuadrado o casi. Va en la barra, el pie, la pantalla de carga, el panel y las vistas previas." value={draft.isotype} onChange={(v) => set("isotype", v)} upload={actions.upload} testId="identity-isotype" />
          <AssetField label="Logo horizontal (opcional)" hint="Si lo subes, reemplaza isotipo + wordmark en la barra y el pie de página." value={draft.logo} onChange={(v) => set("logo", v)} upload={actions.upload} wide testId="identity-logo" />
        </div>
        <div className="mt-10">
          <span className="mb-3 block text-label uppercase text-ink-2">Así se ve en la barra</span>
          <div className="flex h-[72px] items-center justify-center border border-divider bg-bg px-6" data-testid="identity-preview">
            {draft.logo ? (
              <WideLogo asset={draft.logo} height={30} />
            ) : (
              <span className="flex items-center gap-4">
                <Isotype size={44} asset={draft.isotype} />
                <span className="text-[17px] font-semibold uppercase leading-none tracking-[0.32em]">{draft.wordmark || "—"}</span>
              </span>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection n="03" title="Versiones" aside={<span className="text-legal text-ink-3">Las últimas publicaciones</span>}>
        <div className="flex flex-col gap-4" data-testid="identity-versions">
          <p className="m-0 text-small text-ink-2">
            {initial.publishedAt ? <>Publicada por última vez el {formatDate(initial.publishedAt)}.</> : <>La tienda usa la identidad de fábrica: todavía no se ha publicado nada desde el panel.</>}
            {hasDraft && (
              <>
                {" "}Hay un borrador sin publicar.{" "}
                <button type="button" onClick={onDiscard} className="cursor-pointer text-ink underline decoration-accent underline-offset-4 hover:text-accent">
                  Descartar borrador
                </button>
              </>
            )}
          </p>
          <ul className="m-0 flex list-none flex-col gap-px border border-divider bg-divider p-0">
            <li className="flex items-center justify-between gap-4 bg-bg px-5 py-3.5">
              <span className="text-small text-ink-2">Identidad de fábrica ({initial.factory.name})</span>
              <button type="button" onClick={() => load(initial.factory, "Identidad de fábrica")} className="cursor-pointer text-label-sm uppercase text-ink-2 hover:text-ink" data-testid="identity-factory">
                Cargar en el editor
              </button>
            </li>
            {initial.history.map((v) => (
              <li key={v.at} className="flex items-center justify-between gap-4 bg-bg px-5 py-3.5">
                <span className="text-small text-ink-2">
                  {formatDate(v.at)} · {v.input.name}
                </span>
                <button type="button" onClick={() => load(v.input, `Versión del ${formatDate(v.at)}`)} className="cursor-pointer text-label-sm uppercase text-ink-2 hover:text-ink">
                  Cargar en el editor
                </button>
              </li>
            ))}
          </ul>
        </div>
      </FormSection>

      <div className="backdrop-glass fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-glass-deep lg:left-[248px]">
        <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-10 lg:px-14">
          <p className={cn("m-0 flex min-w-0 items-center gap-2.5 text-label-sm uppercase", tone)} role="status" aria-live="polite">
            <span className={cn("h-1.5 w-1.5 shrink-0", status.kind === "error" || dirty ? "bg-accent" : status.kind === "saved" ? "bg-ink" : "bg-ink-3")} aria-hidden="true" />
            <span className="truncate">{text}</span>
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onPreview} disabled={pending} data-testid="identity-preview-open">
              Vista previa ↗
            </Button>
            <Button type="submit" size="sm" disabled={pending || (!dirty && !hasDraft)} data-testid="identity-publish">
              {pending ? "Guardando…" : "Publicar"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
