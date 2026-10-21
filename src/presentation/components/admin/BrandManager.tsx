"use client";
import { useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { BrandDto, BrandInput, BrandsCopyInput } from "@/application/dto/brand.dto";
import type { BrandLogoMode } from "@/domain/entities/brand";
import { Button } from "@/presentation/components/primitives/Button";
import { cn } from "@/presentation/lib/cn";
import { BusyOverlay, measure, slotAction } from "./ImageField";
import { FormSection, Segmented, TextArea, TextInput, Toggle } from "./fields";

const LOGO_ACCEPT = "image/svg+xml,image/png,image/webp,image/avif";

export interface BrandActions {
  save: (input: BrandInput) => Promise<ActionResult<BrandDto>>;
  remove: (slug: string) => Promise<ActionResult>;
  reorder: (slugs: string[]) => Promise<ActionResult>;
  uploadLogo: (fd: FormData) => Promise<ActionResult<{ src: string; ratio: number }>>;
  saveCopy: (input: BrandsCopyInput) => Promise<ActionResult>;
}

type Draft = { originalSlug: string | null; name: string; description: string; lines: string[]; logo: BrandDto["logo"]; color: string; visible: boolean };

const toDraft = (b: BrandDto | null): Draft =>
  b
    ? { originalSlug: b.slug, name: b.name, description: b.description ?? "", lines: [...b.lines], logo: b.logo, color: b.color ?? "", visible: b.visible }
    : { originalSlug: null, name: "", description: "", lines: [], logo: null, color: "", visible: true };

/** El logo como en el marquee: en reposo (blanco o grises) o al pasar el cursor (color de marca). */
export function LogoPreview({ logo, color, hover, height = 34, name }: { logo: BrandDto["logo"]; color: string | null; hover: boolean; height?: number; name: string }) {
  if (!logo) return <span className={cn("text-label uppercase", name ? "text-ink-2" : "text-ink-3")}>{name || "Sin logo"}</span>;
  const box: CSSProperties = { height, width: Math.min(height * logo.ratio, 220) };
  if (logo.mode === "grayscale") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo.src} alt="" style={{ ...box, objectFit: "contain", filter: hover ? "none" : "grayscale(1) brightness(1.15)" }} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{
        ...box,
        display: "block",
        backgroundColor: hover && color ? color : "var(--color-ink)",
        WebkitMask: `url(${logo.src}) center / contain no-repeat`,
        mask: `url(${logo.src}) center / contain no-repeat`,
      }}
    />
  );
}

/**
 * Panel › Marcas: lista ordenable (es el orden del marquee de la home), alta,
 * edición y baja, con el logo en reposo y a color. Abajo, el rótulo y el aviso
 * del marquee.
 */
export function BrandManager({
  initial,
  copy,
  defaults,
  lines,
  actions,
}: {
  initial: BrandDto[];
  copy: BrandsCopyInput;
  defaults: { label: string; disclaimer: string };
  lines: Array<{ slug: string; label: string }>;
  actions: BrandActions;
}) {
  const router = useRouter();
  const [brands, setBrands] = useState(initial);
  const [editing, setEditing] = useState<string | "nueva" | null>(null);
  const [draft, setDraft] = useState<Draft>(toDraft(null));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const [copyDraft, setCopyDraft] = useState({ label: copy.label ?? "", disclaimer: copy.disclaimer ?? "" });
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const open = (b: BrandDto | null) => {
    setEditing(b ? b.slug : "nueva");
    setDraft(toDraft(b));
    setErrors({});
    setMessage(null);
  };
  const close = () => setEditing(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= brands.length) return;
    const next = [...brands];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setBrands(next.map((b, k) => ({ ...b, order: k + 1 })));
    start(async () => {
      const res = await actions.reorder(next.map((b) => b.slug));
      if (!res.ok) setMessage({ tone: "error", text: res.error });
    });
  }

  async function onLogo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setErrors((e) => ({ ...e, file: "" }));
    try {
      // El SVG no se mide en el navegador: el servidor lee su viewBox.
      const { width, height } = file.type === "image/svg+xml" ? { width: 1, height: 1 } : await measure(file);
      const fd = new FormData();
      fd.set("file", file);
      fd.set("width", String(width));
      fd.set("height", String(height));
      const res = await actions.uploadLogo(fd);
      if (res.ok) set("logo", { src: res.data.src, ratio: res.data.ratio, mode: draft.logo?.mode ?? (file.type === "image/svg+xml" ? "silhouette" : "grayscale") });
      else setErrors((e) => ({ ...e, file: res.error }));
    } catch {
      setErrors((e) => ({ ...e, file: "No se pudo leer el archivo." }));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await actions.save({ ...draft, description: draft.description || null, color: draft.color || null });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage({ tone: "error", text: res.error });
        return;
      }
      setBrands((list) => {
        const rest = list.filter((b) => b.slug !== res.data.slug && b.slug !== draft.originalSlug);
        return [...rest, res.data].sort((a, b) => a.order - b.order);
      });
      setMessage({ tone: "ok", text: `${res.data.name} guardada.` });
      setEditing(null);
      router.refresh();
    });
  }

  function onDelete(b: BrandDto) {
    if (!window.confirm(`¿Eliminar la marca ${b.name}?`)) return;
    start(async () => {
      const res = await actions.remove(b.slug);
      if (!res.ok) return setMessage({ tone: "error", text: res.error });
      setBrands((list) => list.filter((x) => x.slug !== b.slug));
      setMessage({ tone: "ok", text: `${b.name} eliminada.` });
      setEditing(null);
    });
  }

  function onSaveCopy(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await actions.saveCopy({ label: copyDraft.label || null, disclaimer: copyDraft.disclaimer || null });
      setCopyStatus(res.ok ? "Guardado · publicado en la home" : res.error);
    });
  }

  const current = editing && editing !== "nueva" ? (brands.find((b) => b.slug === editing) ?? null) : null;
  const editor = (
    <form onSubmit={onSave} noValidate className="flex flex-col gap-6 border border-ink bg-surface-elevated p-5 md:p-7" data-testid="brand-editor">
      <input ref={input} type="file" accept={LOGO_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void onLogo(e.target.files?.[0])} />
      <div className="grid gap-6 md:grid-cols-2">
        <TextInput label="Nombre" value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={60} error={errors.name} hint={current && current.productCount > 0 ? `Al renombrarla, sus ${current.productCount} producto(s) pasan al nuevo nombre.` : undefined} />
        <TextArea label="Descripción (opcional)" rows={2} value={draft.description} onChange={(e) => set("description", e.target.value)} maxLength={200} />
      </div>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 p-0 text-label uppercase text-ink-2">Líneas</legend>
        <div className="flex flex-wrap gap-2">
          {lines.map((l) => {
            const on = draft.lines.includes(l.slug);
            return (
              <button
                key={l.slug}
                type="button"
                aria-pressed={on}
                onClick={() => set("lines", on ? draft.lines.filter((x) => x !== l.slug) : [...draft.lines, l.slug])}
                className={cn("cursor-pointer border px-3.5 py-2.5 text-label-sm uppercase transition-colors", on ? "border-ink bg-ink text-bg" : "border-border text-ink-2 hover:border-ink hover:text-ink")}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-6 border-t border-divider pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <span className="text-label uppercase text-ink-2">Logo</span>
          <div className="grid grid-cols-2 gap-px border border-divider bg-divider">
            {[false, true].map((hover) => (
              <div key={String(hover)} className="relative flex h-28 flex-col items-center justify-center gap-3 bg-bg px-3">
                <LogoPreview logo={draft.logo} color={draft.color || null} hover={hover} name={draft.name} />
                <span className="absolute bottom-2 left-3 text-[10px] uppercase tracking-[0.12em] text-ink-3">{hover ? "Al pasar el cursor" : "En reposo"}</span>
                {uploading && !hover && <BusyOverlay />}
              </div>
            ))}
          </div>
          <div className="flex gap-5">
            <button type="button" onClick={() => input.current?.click()} disabled={uploading} className={slotAction} data-testid="brand-logo-upload">
              {draft.logo ? "Reemplazar logo" : "Subir logo"}
            </button>
            {draft.logo && (
              <button type="button" onClick={() => set("logo", null)} className={cn(slotAction, "hover:text-accent")}>
                Quitar logo
              </button>
            )}
          </div>
          <p className="m-0 text-legal text-ink-3">SVG (ideal) o PNG, WebP o AVIF con fondo transparente. Sin logo, el marquee muestra el nombre.</p>
          {errors.file && (
            <p role="alert" className="m-0 text-label-sm uppercase text-accent">
              {errors.file}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-6">
          {draft.logo && (
            <Segmented<BrandLogoMode>
              label="Cómo se ve en reposo"
              value={draft.logo.mode}
              options={[
                { value: "silhouette", label: "Silueta blanca" },
                { value: "grayscale", label: "Escala de grises" },
              ]}
              onChange={(mode) => set("logo", draft.logo ? { ...draft.logo, mode } : null)}
            />
          )}
          <div className="flex flex-col">
            <span className="mb-2.5 text-label uppercase text-ink-2">Color de marca</span>
            <div className="flex items-center gap-3">
              <input type="color" value={draft.color || "#ffffff"} onChange={(e) => set("color", e.target.value)} aria-label="Elegir color" className="h-12 w-14 cursor-pointer border border-border bg-transparent p-1" />
              <input
                value={draft.color}
                onChange={(e) => set("color", e.target.value.trim())}
                placeholder="#RRGGBB"
                maxLength={7}
                aria-label="Color en hexadecimal"
                className="w-32 border border-border bg-transparent px-4 py-3 text-meta text-ink outline-none focus:border-ink"
              />
              {draft.color && (
                <button type="button" onClick={() => set("color", "")} className={slotAction}>
                  Sin color
                </button>
              )}
            </div>
            {errors.color && <p className="m-0 mt-2 text-label-sm uppercase text-accent">{errors.color}</p>}
          </div>
          <Toggle label="Mostrar en el marquee" description="Solo aparece si además tiene productos." checked={draft.visible} onChange={(v) => set("visible", v)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-divider pt-5">
        {current ? (
          <button
            type="button"
            onClick={() => onDelete(current)}
            disabled={pending || current.productCount > 0}
            title={current.productCount > 0 ? "Tiene productos: asígnales otra marca antes" : undefined}
            className={cn(slotAction, "hover:text-accent")}
            data-testid="brand-delete"
          >
            {current.productCount > 0 ? `No se puede eliminar · ${current.productCount} producto(s)` : "Eliminar marca"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={pending || uploading} data-testid="brand-save">
            {pending ? "Guardando…" : "Guardar marca"}
          </Button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="pb-16" data-testid="brand-manager">
      <FormSection n="01" title="Marcas" aside={<span className="text-legal text-ink-3">El orden es el del marquee de la home</span>}>
        {message && (
          <p role="status" className={cn("m-0 mb-5 text-label-sm uppercase", message.tone === "error" ? "text-accent" : "text-ink")}>
            {message.text}
          </p>
        )}
        {editing === "nueva" && <div className="mb-5">{editor}</div>}
        <ol className="m-0 flex list-none flex-col gap-px border border-divider bg-divider p-0" data-testid="brand-list">
          {brands.map((b, i) => (
            <li key={b.slug} className="bg-bg" data-testid={`brand-${b.slug}`}>
              <div className="flex items-center gap-4 px-5 py-3.5">
                <span className="w-6 text-label-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex h-10 w-[140px] shrink-0 items-center">
                  <LogoPreview logo={b.logo} color={b.color} hover={false} height={26} name="" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("truncate text-label-lg uppercase", b.visible ? "text-ink" : "text-ink-3")}>{b.name}</span>
                  <span className="text-legal text-ink-3">
                    {b.productCount} producto{b.productCount === 1 ? "" : "s"}
                    {!b.visible && " · oculta en el marquee"}
                    {b.visible && b.productCount === 0 && " · no aparece: sin productos"}
                  </span>
                </span>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || pending} aria-label={`Subir ${b.name}`} className="cursor-pointer text-label-sm text-ink-2 hover:text-ink disabled:opacity-30">
                  ↑
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === brands.length - 1 || pending} aria-label={`Bajar ${b.name}`} className="cursor-pointer text-label-sm text-ink-2 hover:text-ink disabled:opacity-30">
                  ↓
                </button>
                <button type="button" onClick={() => (editing === b.slug ? close() : open(b))} className="cursor-pointer text-label-sm uppercase text-ink-2 hover:text-ink" aria-expanded={editing === b.slug}>
                  {editing === b.slug ? "Cerrar" : "Editar"}
                </button>
              </div>
              {editing === b.slug && <div className="px-3 pb-3">{editor}</div>}
            </li>
          ))}
        </ol>
        {editing !== "nueva" && (
          <button
            type="button"
            onClick={() => open(null)}
            className="mt-5 w-fit cursor-pointer border border-dashed border-border px-5 py-3.5 text-label uppercase text-ink-2 transition-colors hover:border-ink hover:text-ink"
            data-testid="brand-new"
          >
            + Nueva marca
          </button>
        )}
      </FormSection>

      <FormSection n="02" title="Textos del marquee" aside={<span className="text-legal text-ink-3">Vacío: el texto de siempre</span>}>
        <form onSubmit={onSaveCopy} className="flex flex-col gap-6" data-testid="brands-copy">
          <TextInput label="Rótulo" value={copyDraft.label} onChange={(e) => setCopyDraft((c) => ({ ...c, label: e.target.value }))} placeholder={defaults.label} maxLength={60} />
          <TextArea label="Aviso de revendedor independiente" rows={3} value={copyDraft.disclaimer} onChange={(e) => setCopyDraft((c) => ({ ...c, disclaimer: e.target.value }))} placeholder={defaults.disclaimer} maxLength={300} />
          <div className="flex items-center gap-4">
            <Button type="submit" size="sm" disabled={pending}>
              Guardar textos
            </Button>
            {copyStatus && <span className="text-label-sm uppercase text-ink-2">{copyStatus}</span>}
          </div>
        </form>
      </FormSection>
    </div>
  );
}
