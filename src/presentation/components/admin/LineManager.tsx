"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TEMPLATE_LABEL, type ActionResult, type AdminImageInput, type AdminLineDto, type LineInput } from "@/application/dto/admin.dto";
import { LINE_TEMPLATES, type LineTemplate } from "@/domain/entities/product-line";
import { Button } from "@/presentation/components/primitives/Button";
import { cn } from "@/presentation/lib/cn";
import { Select, TextInput } from "./fields";
import { ImageSlot, type UploadAction } from "./ImageField";

type SaveLine = (input: LineInput) => Promise<ActionResult<{ slug: string }>>;
type DeleteLine = (slug: string) => Promise<ActionResult>;

const TEMPLATE_HINT: Record<LineTemplate, string> = {
  reloj: "Movimiento, caja, reserva y hermeticidad. Se vende por pieza.",
  joya: "Metal, piedras, quilates y tallas. Se vende por pieza.",
  perfume: "Concentración, notas olfativas y mililitros. Se vende por unidades.",
  general: "Características libres (etiqueta y valor). Se vende por unidades.",
};

/**
 * Líneas del catálogo. Crear una es mínimo: nombre y plantilla. La plantilla
 * decide la ficha técnica y los filtros de la tienda y no cambia después.
 */
export function LineManager({ lines, save, remove, upload }: { lines: AdminLineDto[]; save: SaveLine; remove: DeleteLine; upload: UploadAction }) {
  const nextOrder = lines.reduce((m, l) => Math.max(m, l.order), 0) + 1;
  return (
    <div className="max-w-[980px]">
      <ul className="m-0 grid list-none gap-6 p-0">
        {lines.map((l) => (
          <LineCard key={l.slug} line={l} save={save} remove={remove} upload={upload} />
        ))}
      </ul>
      <NewLine key={nextOrder} order={nextOrder} save={save} />
    </div>
  );
}

function LineCard({ line, save, remove, upload }: { line: AdminLineDto; save: SaveLine; remove: DeleteLine; upload: UploadAction }) {
  const router = useRouter();
  const [label, setLabel] = useState(line.label);
  const [description, setDescription] = useState(line.description);
  const [order, setOrder] = useState(String(line.order));
  const [cover, setCover] = useState<AdminImageInput | null>(line.cover);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = label !== line.label || description !== line.description || order !== String(line.order) || cover?.src !== line.cover?.src;
  const inUse = line.productCount > 0 || line.categoryCount > 0;

  const submit = () =>
    start(async () => {
      const res = await save({ originalSlug: line.slug, slug: line.slug, label, description, order: Number(order) || 0, template: line.template, cover });
      setError(res.ok ? null : res.error);
      if (res.ok) router.refresh();
    });

  const del = () => {
    if (!window.confirm(`¿Eliminar la línea "${line.label}"?`)) return;
    start(async () => {
      const res = await remove(line.slug);
      setError(res.ok ? null : res.error);
      if (res.ok) router.refresh();
    });
  };

  return (
    <li className="border border-divider bg-surface-elevated">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="grid gap-6 p-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8 md:p-7"
      >
        <ImageSlot label="Portada" value={cover} onChange={setCover} upload={upload} />
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="text-label-sm uppercase text-ink-3">
              /coleccion/{line.slug} · Plantilla {TEMPLATE_LABEL[line.template]}
            </span>
            <span className="text-label-sm uppercase text-ink-2">
              {line.productCount} productos · {line.categoryCount} categorías
            </span>
          </div>
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_110px]">
            <TextInput label="Nombre" value={label} onChange={(e) => setLabel(e.target.value)} />
            <TextInput label="Orden" inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value.replace(/\D/g, ""))} />
          </div>
          <TextInput label="Frase de portada" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={160} hint="Aparece en la home y en la página de la línea." />
          <div className="mt-1 flex items-center justify-end gap-5">
            {error && (
              <p role="alert" className="m-0 mr-auto text-label-sm uppercase text-accent">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={del}
              disabled={pending || inUse}
              title={inUse ? "Tiene productos o categorías" : undefined}
              className="cursor-pointer text-label-sm uppercase text-ink-3 transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink-3"
            >
              Eliminar
            </button>
            <Button type="submit" size="sm" disabled={pending || !dirty}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </form>
    </li>
  );
}

function NewLine({ order, save }: { order: number; save: SaveLine }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [template, setTemplate] = useState<LineTemplate>("general");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-12 border-t border-divider pt-10"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await save({ originalSlug: null, slug: "", label, description: "", order, template, cover: null });
          if (!res.ok) return setError(res.fieldErrors?.label ?? res.error);
          setError(null);
          setLabel("");
          router.refresh();
        });
      }}
    >
      <h2 className="m-0 mb-6 text-h3 uppercase">Nueva línea</h2>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px_auto] md:items-start">
        <TextInput label="Nombre" placeholder="p. ej. Gafas" value={label} onChange={(e) => setLabel(e.target.value)} error={error ?? undefined} />
        <Select
          label="Plantilla"
          value={template}
          onChange={(e) => setTemplate(e.target.value as LineTemplate)}
          options={LINE_TEMPLATES.map((t) => ({ value: t, label: TEMPLATE_LABEL[t] }))}
        />
        <Button type="submit" size="sm" variant="secondary" disabled={pending || !label.trim()} className={cn("md:mt-[34px]")}>
          {pending ? "Creando…" : "Crear línea"}
        </Button>
      </div>
      <p className="m-0 mt-3 text-legal text-ink-2">{TEMPLATE_HINT[template]} La plantilla no se puede cambiar después.</p>
    </form>
  );
}
