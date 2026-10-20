"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ActionResult, AdminImageInput, AdminWatchFormDto, AdminWatchInput } from "@/application/dto/admin.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { formatCop } from "@/presentation/lib/format-money";
import { cn } from "@/presentation/lib/cn";
import { FormSection, Select, TextArea, TextInput, Toggle } from "./fields";
import { GalleryField, ImageSlot, type UploadAction } from "./ImageField";
import { AdminPageHeader } from "./AdminShell";

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

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const digits = (s: string) => s.replace(/\D/g, "");
const intOrNull = (s: string): number | null => (digits(s) === "" ? null : Number(digits(s)));
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const paragraphs = (s: string) => s.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);

/** Estado editable: los números y listas se editan como texto y se convierten al guardar. */
interface Draft {
  brand: string;
  model: string;
  reference: string;
  slug: string;
  subtitle: string;
  price: string;
  category: string;
  condition: AdminWatchFormDto["condition"];
  availability: AdminWatchFormDto["availability"];
  featured: boolean;
  description: string;
  includes: string;
  movement: string;
  powerReserve: string;
  caseMm: string;
  caseMaterial: string;
  crystal: string;
  waterResistance: string;
  front: AdminImageInput | null;
  back: AdminImageInput | null;
  gallery: AdminImageInput[];
}

function toDraft(w: AdminWatchFormDto): Draft {
  return {
    brand: w.brand,
    model: w.model,
    reference: w.reference,
    slug: w.slug,
    subtitle: w.subtitle,
    price: w.priceUnits ? String(w.priceUnits) : "",
    category: w.category,
    condition: w.condition,
    availability: w.availability,
    featured: w.featured,
    description: w.description.join("\n\n"),
    includes: w.includes.join("\n"),
    movement: w.specs.movement,
    powerReserve: w.specs.powerReserveHours?.toString() ?? "",
    caseMm: w.specs.caseMm ? String(w.specs.caseMm) : "",
    caseMaterial: w.specs.caseMaterial,
    crystal: w.specs.crystal,
    waterResistance: w.specs.waterResistanceM?.toString() ?? "",
    front: w.media.front,
    back: w.media.back,
    gallery: w.media.gallery,
  };
}

function toInput(id: string | null, d: Draft): AdminWatchInput {
  return {
    id,
    brand: d.brand,
    model: d.model,
    reference: d.reference,
    slug: d.slug,
    subtitle: d.subtitle,
    priceUnits: Number(digits(d.price) || "0"),
    category: d.category,
    condition: d.condition,
    availability: d.availability,
    featured: d.featured,
    description: paragraphs(d.description),
    includes: lines(d.includes),
    specs: {
      movement: d.movement,
      powerReserveHours: intOrNull(d.powerReserve),
      caseMm: Number(d.caseMm.replace(",", ".")) || 0,
      caseMaterial: d.caseMaterial,
      crystal: d.crystal,
      waterResistanceM: intOrNull(d.waterResistance),
    },
    media: { front: d.front, back: d.back, gallery: d.gallery },
  };
}

type Status = { kind: "idle" } | { kind: "saved" } | { kind: "error"; message: string };

export function WatchForm({
  initial,
  categories,
  save,
  remove,
  upload,
  storeHref,
  updatedAt,
  justCreated = false,
}: {
  initial: AdminWatchFormDto;
  categories: ReadonlyArray<{ slug: string; label: string }>;
  save: (input: AdminWatchInput) => Promise<ActionResult<{ id: string; slug: string }>>;
  remove?: (id: string) => Promise<ActionResult>;
  upload: UploadAction;
  storeHref?: string;
  updatedAt?: string;
  /** Recién creado: la ruta se reemplaza y el formulario se vuelve a montar ya guardado. */
  justCreated?: boolean;
}) {
  const router = useRouter();
  const [id, setId] = useState(initial.id);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(toDraft(initial)));
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>(justCreated ? { kind: "saved" } : { kind: "idle" });
  const [pending, start] = useTransition();

  const dirty = JSON.stringify(draft) !== saved;
  const name = `${draft.brand} ${draft.model}`.trim();
  const priceUnits = Number(digits(draft.price) || "0");

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
      const res = await save(toInput(id, draft));
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
    if (!window.confirm(`¿Eliminar ${name || "este reloj"}? Esta acción no se puede deshacer.`)) return;
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

  return (
    <form onSubmit={onSubmit} noValidate>
      <AdminPageHeader
        kicker={id ? `Catálogo · Ref. ${draft.reference || "—"}` : "Catálogo · Nueva pieza"}
        title={name || "Nuevo reloj"}
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
              <TextInput label="Marca" value={draft.brand} onChange={(e) => set("brand", e.target.value)} error={err("brand")} placeholder="Rolex" />
              <TextInput label="Modelo" value={draft.model} onChange={(e) => set("model", e.target.value)} error={err("model")} placeholder="Sky-Dweller" />
              <TextInput label="Referencia" value={draft.reference} onChange={(e) => set("reference", e.target.value)} error={err("reference")} placeholder="326938" />
              <TextInput
                label="Slug"
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value) || e.target.value.toLowerCase());
                }}
                error={err("slug")}
                hint={<span className="break-all">/reloj/{draft.slug || "…"}</span>}
              />
              <TextInput
                className="md:col-span-2"
                label="Subtítulo"
                value={draft.subtitle}
                onChange={(e) => set("subtitle", e.target.value)}
                error={err("subtitle")}
                placeholder="GMT · Calendario anual · 42 mm"
              />
            </div>
          </FormSection>

          <FormSection n="02" title="Fotos" aside={<span className="text-legal text-ink-3">Fondo transparente o negro, cuadradas</span>}>
            <div className="grid gap-6 md:grid-cols-2">
              <ImageSlot label="Frente" value={draft.front} onChange={(v) => set("front", v)} upload={upload} error={err("media.front")} />
              <ImageSlot label="Reverso" value={draft.back} onChange={(v) => set("back", v)} upload={upload} error={err("media.back")} />
            </div>
            <div className="mt-10">
              <span className="mb-4 block text-label uppercase text-ink-2">Galería · {draft.gallery.length}</span>
              <GalleryField value={draft.gallery} onChange={(v) => set("gallery", v)} upload={upload} />
            </div>
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

          <FormSection n="04" title="Especificaciones">
            <div className="grid gap-6 md:grid-cols-2">
              <TextInput
                className="md:col-span-2"
                label="Movimiento"
                value={draft.movement}
                onChange={(e) => set("movement", e.target.value)}
                error={err("specs.movement")}
                placeholder="Automático · Cal. 3235"
              />
              <TextInput label="Caja (mm)" inputMode="decimal" value={draft.caseMm} onChange={(e) => set("caseMm", e.target.value)} error={err("specs.caseMm")} />
              <TextInput label="Material" value={draft.caseMaterial} onChange={(e) => set("caseMaterial", e.target.value)} error={err("specs.caseMaterial")} placeholder="Acero Oystersteel" />
              <TextInput
                label="Reserva de marcha (h)"
                inputMode="numeric"
                value={draft.powerReserve}
                onChange={(e) => set("powerReserve", digits(e.target.value))}
                error={err("specs.powerReserveHours")}
                hint="Vacío si no aplica."
              />
              <TextInput
                label="Hermeticidad (m)"
                inputMode="numeric"
                value={draft.waterResistance}
                onChange={(e) => set("waterResistance", digits(e.target.value))}
                error={err("specs.waterResistanceM")}
                hint="Vacío si no aplica."
              />
              <TextInput label="Cristal" value={draft.crystal} onChange={(e) => set("crystal", e.target.value)} error={err("specs.crystal")} />
            </div>
          </FormSection>
        </div>

        <aside className="self-start xl:sticky xl:top-10">
          <div className="border border-divider bg-surface-elevated p-7">
            <span className="block text-kicker uppercase text-ink-2">Venta</span>
            <div className="mt-7 grid gap-6">
              <TextInput
                label="Precio (COP)"
                inputMode="numeric"
                value={draft.price ? Number(digits(draft.price)).toLocaleString("es-CO") : ""}
                onChange={(e) => set("price", digits(e.target.value))}
                error={err("priceUnits")}
                placeholder="0"
              />
              <p className="-mt-3 m-0 text-h3 font-medium tabular-nums text-ink" aria-live="polite">
                {priceUnits > 0 ? formatCop(priceUnits * 100) : "—"}
              </p>
              <Select label="Categoría" value={draft.category} onChange={(e) => set("category", e.target.value)} options={categoryOptions} error={err("category")} />
              <Select
                label="Disponibilidad"
                value={draft.availability}
                onChange={(e) => set("availability", e.target.value as Draft["availability"])}
                options={AVAILABILITY}
              />
              <Select label="Condición" value={draft.condition} onChange={(e) => set("condition", e.target.value as Draft["condition"])} options={CONDITION} />
              <div className="border-t border-divider pt-6">
                <Toggle
                  label="Destacado"
                  description="Protagoniza el hero de la home. Solo uno a la vez."
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
            <Button type="submit" size="sm" disabled={pending || (!dirty && Boolean(id))} data-testid="save-watch">
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>
      {id && remove && (
        <div className="mt-6 md:hidden">
          <button type="button" onClick={onDelete} className="cursor-pointer text-label uppercase text-ink-2 hover:text-accent">
            Eliminar reloj
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

