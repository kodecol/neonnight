"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult, AdminLineDto, CategoryDto, CategoryInput } from "@/application/dto/admin.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { cn } from "@/presentation/lib/cn";

type SaveCategory = (input: CategoryInput) => Promise<ActionResult<{ slug: string }>>;
type DeleteCategory = (slug: string) => Promise<ActionResult>;

const cell = "w-full border bg-transparent px-3.5 py-3 text-meta text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink";

/** Categorías agrupadas por línea, editables en línea: nombre y orden por fila, más una fila para crear en cada línea. */
export function CategoryManager({ categories, lines, save, remove }: { categories: CategoryDto[]; lines: AdminLineDto[]; save: SaveCategory; remove: DeleteCategory }) {
  const nextOrder = categories.reduce((m, c) => Math.max(m, c.order), 0) + 1;
  return (
    <div className="flex max-w-[860px] flex-col gap-14">
      {lines.map((line) => {
        const own = categories.filter((c) => c.line === line.slug);
        return (
          <section key={line.slug} aria-labelledby={`cat-${line.slug}`}>
            <h2 id={`cat-${line.slug}`} className="m-0 mb-4 flex items-baseline gap-3 text-h3 uppercase">
              {line.label}
              <span className="text-label-sm text-ink-3">{own.length}</span>
            </h2>
            <div className="hidden grid-cols-[minmax(0,1fr)_200px_90px_150px] gap-4 border-b border-divider pb-3 text-label-sm uppercase text-ink-3 md:grid">
              <span>Nombre</span>
              <span>Slug</span>
              <span>Orden</span>
              <span className="text-right">Productos</span>
            </div>
            <ul className="m-0 list-none p-0">
              {own.map((c) => (
                <Row key={c.slug} category={c} save={save} remove={remove} />
              ))}
            </ul>
            <NewRow key={`${line.slug}-${nextOrder}`} line={line} order={nextOrder} save={save} />
          </section>
        );
      })}
      <p className="m-0 max-w-[60ch] text-legal text-ink-2">
        El slug se fija al crear la categoría porque lo usan los productos y la URL de la colección (<span className="text-ink">/coleccion/linea?categoria=slug</span>). Una
        categoría con productos asignados no se puede eliminar.
      </p>
    </div>
  );
}

function Row({ category, save, remove }: { category: CategoryDto; save: SaveCategory; remove: DeleteCategory }) {
  const router = useRouter();
  const [label, setLabel] = useState(category.label);
  const [order, setOrder] = useState(String(category.order));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = label !== category.label || order !== String(category.order);

  const submit = () =>
    start(async () => {
      const res = await save({ originalSlug: category.slug, slug: category.slug, label, order: Number(order) || 0, line: category.line });
      setError(res.ok ? null : res.error);
      if (res.ok) router.refresh();
    });

  const del = () => {
    if (!window.confirm(`¿Eliminar la categoría "${category.label}"?`)) return;
    start(async () => {
      const res = await remove(category.slug);
      setError(res.ok ? null : res.error);
      if (res.ok) router.refresh();
    });
  };

  return (
    <li className="border-b border-divider py-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="grid grid-cols-[minmax(0,1fr)_80px] items-center gap-3 md:grid-cols-[minmax(0,1fr)_200px_90px_150px] md:gap-4"
      >
        <input aria-label="Nombre" value={label} onChange={(e) => setLabel(e.target.value)} className={cn(cell, "border-border")} />
        <span className="hidden truncate text-small text-ink-3 md:block">{category.slug}</span>
        <input aria-label="Orden" inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value.replace(/\D/g, ""))} className={cn(cell, "border-border text-center")} />
        <div className="col-span-2 flex items-center justify-between gap-4 md:col-span-1 md:justify-end">
          <span className="text-small tabular-nums text-ink-2 md:hidden">{category.productCount} productos</span>
          {dirty ? (
            <button type="submit" disabled={pending} className="cursor-pointer text-label-sm uppercase text-accent hover:text-ink disabled:opacity-45">
              {pending ? "Guardando…" : "Guardar"}
            </button>
          ) : (
            <span className="flex items-center gap-5">
              <span className="hidden text-small tabular-nums text-ink-2 md:inline">{category.productCount}</span>
              <button
                type="button"
                onClick={del}
                disabled={pending || category.productCount > 0}
                title={category.productCount > 0 ? "Tiene productos asignados" : undefined}
                className="cursor-pointer text-label-sm uppercase text-ink-3 transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink-3"
              >
                Eliminar
              </button>
            </span>
          )}
        </div>
      </form>
      {error && (
        <p role="alert" className="m-0 mt-2 text-label-sm uppercase text-accent">
          {error}
        </p>
      )}
    </li>
  );
}

function NewRow({ line, order, save }: { line: AdminLineDto; order: number; save: SaveCategory }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-5 flex flex-col gap-3 md:flex-row md:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await save({ originalSlug: null, slug: "", label, order, line: line.slug });
          if (!res.ok) return setError(res.fieldErrors?.label ?? res.error);
          setError(null);
          setLabel("");
          router.refresh();
        });
      }}
    >
      <div className="w-full md:max-w-[420px]">
        <input
          aria-label={`Nueva categoría de ${line.label}`}
          placeholder={`Nueva categoría de ${line.label.toLowerCase()}`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className={cn(cell, error ? "border-accent" : "border-border")}
        />
        {error && (
          <p role="alert" className="m-0 mt-2 text-label-sm uppercase text-accent">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending || !label.trim()}>
        {pending ? "Creando…" : "Añadir"}
      </Button>
    </form>
  );
}
