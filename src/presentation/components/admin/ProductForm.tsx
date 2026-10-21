"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ActionResult, AdminProductFormDto, AdminProductInput, MediaRoleKey } from "@/application/dto/admin.dto";
import { TEMPLATE_LABEL } from "@/application/dto/admin.dto";
import type { LineTemplate } from "@/domain/entities/product-line";
import { Button } from "@/presentation/components/primitives/Button";
import { formatCop } from "@/presentation/lib/format-money";
import { ROUTES } from "@/presentation/lib/site";
import { cn } from "@/presentation/lib/cn";
import { FormSection, Select, TextArea, TextInput, Toggle } from "./fields";
import type { UploadAction } from "./ImageField";
import { MediaLibrary, type RoleCopy } from "./MediaLibrary";
import { BrandPicker } from "./BrandPicker";
import type { BrandDto } from "@/application/dto/brand.dto";
import type { MediaDraft } from "@/presentation/lib/media-draft";
import { AdminPageHeader } from "./AdminShell";
import { SpecsFields, specsToDraft, specsToInput, type SpecsDraft } from "./SpecsFields";
import { VariantsField, type VariantDraft } from "./VariantsField";

const AVAILABILITY = [
  { value: "disponible", label: "Disponible" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido" },
] as const;
const CONDITION = [
  { value: "nuevo", label: "Nuevo" },
  { value: "como-nuevo", label: "Como nuevo" },
  { value: "excelente", label: "Excelente" },
] as const;

/** Usos de las fotos en la ficha, con dónde aparecen en la tienda. */
const MEDIA_ROLES: Record<MediaRoleKey, RoleCopy> = {
  front: { label: "Portada", hint: "Tarjeta del catálogo y cabecera si no hay hero", badge: "Portada" },
  back: { label: "Segunda vista", hint: "Aparece al pasar el cursor por la tarjeta", badge: "2.ª vista" },
  hero: { label: "Fondo del hero", hint: "Foto de ambiente detrás del nombre de la pieza", badge: "Hero" },
  band: { label: "Imagen final", hint: "Banda a pantalla completa al cierre de la ficha", badge: "Final" },
};

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const paragraphs = (s: string) => s.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);

/** Estado editable: los números y listas se editan como texto y se convierten al guardar. */
interface Draft {
  brand: string;
  model: string;
  reference: string;
  slug: string;
  subtitle: string;
  category: string;
  condition: AdminProductFormDto["condition"];
  availability: AdminProductFormDto["availability"];
  featured: boolean;
  description: string;
  includes: string;
  specs: SpecsDraft;
  variants: VariantDraft[];
  media: MediaDraft;
}

function toDraft(p: AdminProductFormDto): Draft {
  return {
    brand: p.brand,
    model: p.model,
    reference: p.reference,
    slug: p.slug,
    subtitle: p.subtitle,
    category: p.category,
    condition: p.condition,
    availability: p.availability,
    featured: p.featured,
    description: p.description.join("\n\n"),
    includes: p.includes.join("\n"),
    specs: specsToDraft(p.specs),
    variants: p.variants.map((v, i) => ({ key: v.id ?? `nueva-${i}`, id: v.id, label: v.label, price: v.priceUnits ? String(v.priceUnits) : "", stock: String(v.stock) })),
    media: p.media,
  };
}

function toInput(id: string | null, line: string, d: Draft): AdminProductInput {
  return {
    id,
    line,
    category: d.category,
    brand: d.brand,
    model: d.model,
    reference: d.reference,
    slug: d.slug,
    subtitle: d.subtitle,
    condition: d.condition,
    availability: d.availability,
    featured: d.featured,
    description: paragraphs(d.description),
    includes: lines(d.includes),
    specs: specsToInput(d.specs),
    variants: d.variants.map((v) => ({ id: v.id, label: v.label, priceUnits: Number(v.price || "0"), stock: Number(v.stock || "0") })),
    media: d.media,
  };
}

type Status = { kind: "idle" } | { kind: "saved" } | { kind: "error"; message: string };

export function ProductForm({
  initial,
  line,
  categories,
  save,
  remove,
  upload,
  brands,
  createBrand,
  updatedAt,
  justCreated = false,
}: {
  initial: AdminProductFormDto;
  line: { slug: string; label: string; template: LineTemplate };
  /** Categorías de la línea del producto. */
  categories: ReadonlyArray<{ slug: string; label: string }>;
  save: (input: AdminProductInput) => Promise<ActionResult<{ id: string; slug: string }>>;
  remove?: (id: string) => Promise<ActionResult>;
  upload: UploadAction;
  /** Marcas del panel › Marcas (nombres) y cómo crear una al vuelo. */
  brands: readonly string[];
  createBrand: (name: string) => Promise<ActionResult<BrandDto>>;
  updatedAt?: string;
  /** Recién creado: la ruta se reemplaza y el formulario se vuelve a montar ya guardado. */
  justCreated?: boolean;
}) {
  const router = useRouter();
  const [id, setId] = useState(initial.id);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [brandNames, setBrandNames] = useState<string[]>(() => [...brands]);
  const [saved, setSaved] = useState(() => JSON.stringify(toDraft(initial)));
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>(justCreated ? { kind: "saved" } : { kind: "idle" });
  const [pending, start] = useTransition();
  const keySeq = useRef(0);

  const dirty = JSON.stringify(draft) !== saved;
  const name = `${draft.brand} ${draft.model}`.trim();
  const template = line.template;
  const prices = draft.variants.map((v) => Number(v.price || "0")).filter((n) => n > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const stock = draft.variants.reduce((n, v) => n + Number(v.stock || "0"), 0);
  const storeHref = id ? ROUTES.product(template, initial.slug) : null;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (!slugTouched && (key === "brand" || key === "model" || key === "reference")) {
        next.slug = slugify(`${next.brand} ${next.model} ${next.reference}`);
      }
      return next;
    });
    if (status.kind !== "idle") setStatus({ kind: "idle" });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await save(toInput(id, line.slug, draft));
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setStatus({ kind: "error", message: res.error });
        return;
      }
      setErrors({});
      setSaved(JSON.stringify(draft));
      setStatus({ kind: "saved" });
      if (!id) {
        setId(res.data.id);
        setSlugTouched(true);
        router.replace(`/admin/catalogo/${res.data.id}?creado=1`);
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (!id || !remove) return;
    if (!window.confirm(`¿Eliminar ${name || "este producto"}? Esta acción no se puede deshacer.`)) return;
    start(async () => {
      const res = await remove(id);
      if (!res.ok) return setStatus({ kind: "error", message: res.error });
      router.push("/admin/catalogo");
      router.refresh();
    });
  }

  const err = (k: string) => errors[k];
  const categoryOptions = useMemo(
    () => [...(categories.some((c) => c.slug === draft.category) ? [] : [{ value: "", label: "Elige una categoría" }]), ...categories.map((c) => ({ value: c.slug, label: c.label }))],
    [categories, draft.category],
  );
  const mediaError = Object.entries(errors).find(([k]) => k.startsWith("media"))?.[1];

  return (
    <form onSubmit={onSubmit} noValidate>
      <AdminPageHeader
        kicker={`${line.label} · ${id ? (draft.reference ? `Ref. ${draft.reference}` : "Editar") : "Nueva pieza"}`}
        title={name || `Nuevo producto`}
        actions={
          storeHref ? (
            <Button href={storeHref} variant="ghost" size="sm" target="_blank" rel="noreferrer">
              Ver en tienda ↗
            </Button>
          ) : null
        }
      />

      <div className="grid gap-x-14 gap-y-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <FormSection n="01" title="Identidad">
            <div className="grid gap-6 md:grid-cols-2">
              <BrandPicker
                value={draft.brand}
                onChange={(v) => set("brand", v)}
                brands={brandNames}
                onCreated={(n) => setBrandNames((list) => (list.includes(n) ? list : [...list, n].sort((a, b) => a.localeCompare(b, "es"))))}
                create={createBrand}
                error={err("brand")}
                placeholder={template === "perfume" ? "Creed" : template === "joya" ? "Cartier" : "Rolex"}
              />
              <TextInput label="Modelo" value={draft.model} onChange={(e) => set("model", e.target.value)} error={err("model")} placeholder={template === "perfume" ? "Aventus" : template === "joya" ? "Brazalete LOVE" : "Sky-Dweller"} />
              <TextInput
                label="Referencia"
                value={draft.reference}
                onChange={(e) => set("reference", e.target.value)}
                error={err("reference")}
                placeholder={template === "perfume" ? "Opcional" : "326938"}
                hint={template === "reloj" ? undefined : "Opcional."}
              />
              <TextInput
                label="Slug"
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value) || e.target.value.toLowerCase());
                }}
                error={err("slug")}
                hint={<span className="break-all">{ROUTES.product(template, draft.slug || "…")}</span>}
              />
              <TextInput
                className="md:col-span-2"
                label="Subtítulo"
                value={draft.subtitle}
                onChange={(e) => set("subtitle", e.target.value)}
                error={err("subtitle")}
                placeholder={template === "perfume" ? "Eau de Parfum · Unisex" : template === "joya" ? "Oro amarillo 18 k · Modelo clásico" : "GMT · Calendario anual · 42 mm"}
              />
            </div>
          </FormSection>

          <FormSection n="02" title="Fotos" aside={<span className="text-legal text-ink-3">Una sola biblioteca: cada foto puede ir en varios lugares</span>}>
            <MediaLibrary value={draft.media} onChange={(m) => set("media", m)} upload={upload} roles={MEDIA_ROLES} heroVideoPoster={initial.heroVideoPoster} error={mediaError} />
          </FormSection>

          <FormSection n="03" title="Descripción">
            <div className="grid gap-6">
              <TextArea
                label="Texto"
                rows={8}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                error={err("description")}
                hint="Separa los párrafos con una línea en blanco."
              />
              <TextArea label="Incluye" rows={3} value={draft.includes} onChange={(e) => set("includes", e.target.value)} error={err("includes")} hint="Un elemento por línea." />
            </div>
          </FormSection>

          <FormSection n="04" title="Ficha técnica" aside={<span className="text-legal text-ink-3">Plantilla: {TEMPLATE_LABEL[template]}</span>}>
            <SpecsFields value={draft.specs} onChange={(v) => set("specs", v)} err={err} />
          </FormSection>

          <FormSection n="05" title="Presentaciones y stock" aside={<span className="text-legal text-ink-3">Talla, mililitros o versión</span>}>
            <VariantsField value={draft.variants} onChange={(v) => set("variants", v)} template={template} err={err} newKey={() => `nueva-${Date.now()}-${keySeq.current++}`} />
          </FormSection>
        </div>

        <aside className="self-start xl:sticky xl:top-10">
          <div className="border border-divider bg-surface-elevated p-7">
            <span className="block text-kicker uppercase text-ink-2">Venta</span>
            <p className="m-0 mt-5 font-sans text-h3 font-medium tabular-nums text-ink" aria-live="polite">
              {minPrice > 0 ? (
                <>
                  {draft.variants.length > 1 && new Set(prices).size > 1 && <span className="text-ink-2">Desde </span>}
                  {formatCop(minPrice * 100)}
                </>
              ) : (
                "—"
              )}
            </p>
            <p className="m-0 mt-1.5 text-legal text-ink-2">
              {stock} {stock === 1 ? "unidad" : "unidades"} en {draft.variants.length} {draft.variants.length === 1 ? "presentación" : "presentaciones"}
            </p>
            <div className="mt-7 grid gap-6">
              <Select label="Categoría" value={draft.category} onChange={(e) => set("category", e.target.value)} options={categoryOptions} error={err("category")} />
              <Select
                label="Disponibilidad"
                value={draft.availability}
                onChange={(e) => set("availability", e.target.value as Draft["availability"])}
                options={AVAILABILITY}
                hint="El agotado se calcula solo con el stock."
              />
              <Select label="Condición" value={draft.condition} onChange={(e) => set("condition", e.target.value as Draft["condition"])} options={CONDITION} />
              <div className="border-t border-divider pt-6">
                <Toggle
                  label="Destacado"
                  description="Protagoniza el hero de la home cuando Inicio sigue a la pieza destacada. Solo uno a la vez."
                  checked={draft.featured}
                  onChange={(v) => set("featured", v)}
                />
              </div>
            </div>
          </div>
          {updatedAt && <p className="m-0 mt-4 text-legal text-ink-3">Actualizado {new Date(updatedAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</p>}
        </aside>
      </div>

      <div className="backdrop-glass fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-glass-deep lg:left-[248px]">
        <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-10 lg:px-14">
          <StatusLine status={status} dirty={dirty} pending={pending} />
          <div className="flex shrink-0 items-center gap-3">
            {id && remove && (
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="hidden cursor-pointer border border-border px-4 py-3.5 text-label-sm uppercase text-ink-2 transition-colors hover:border-accent hover:text-accent disabled:opacity-45 md:inline-flex"
              >
                Eliminar
              </button>
            )}
            <Button href="/admin/catalogo" variant="secondary" size="sm">
              Volver
            </Button>
            <Button type="submit" size="sm" disabled={pending || (!dirty && Boolean(id))} data-testid="save-product">
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>
      {id && remove && (
        <div className="mt-6 md:hidden">
          <button type="button" onClick={onDelete} className="cursor-pointer text-label uppercase text-ink-2 hover:text-accent">
            Eliminar producto
          </button>
        </div>
      )}
    </form>
  );
}

function StatusLine({ status, dirty, pending }: { status: Status; dirty: boolean; pending: boolean }) {
  const [text, tone] = pending
    ? ["Guardando…", "text-ink-2"]
    : status.kind === "error"
      ? [status.message, "text-accent"]
      : dirty
        ? ["Cambios sin guardar", "text-ink-2"]
        : status.kind === "saved"
          ? ["Guardado · publicado en la tienda", "text-ink"]
          : ["Sin cambios", "text-ink-3"];
  return (
    <p className={cn("m-0 flex min-w-0 items-center gap-2.5 text-label-sm uppercase", tone)} role="status" aria-live="polite">
      <span className={cn("h-1.5 w-1.5 shrink-0", status.kind === "error" || dirty ? "bg-accent" : status.kind === "saved" ? "bg-ink" : "bg-ink-3")} aria-hidden="true" />
      <span className="truncate">{text}</span>
    </p>
  );
}
