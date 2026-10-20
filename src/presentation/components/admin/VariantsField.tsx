"use client";
import type { LineTemplate } from "@/domain/entities/product-line";
import { cn } from "@/presentation/lib/cn";

export interface VariantDraft {
  /** Clave local estable para React (el id real puede no existir aún). */
  key: string;
  id: string | null;
  label: string;
  price: string;
  stock: string;
}

const PLACEHOLDER: Record<LineTemplate, string> = { reloj: "Versión", joya: "Talla 17", perfume: "100 ml", general: "Opción" };

const cell = "w-full border bg-transparent px-3.5 py-3 text-meta text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink";
const digits = (s: string) => s.replace(/\D/g, "");

/**
 * Presentaciones del producto: nombre, precio y stock por fila. Con una sola,
 * el nombre puede quedar vacío y la tienda no muestra selector.
 */
export function VariantsField({
  value,
  onChange,
  template,
  err,
  newKey,
}: {
  value: VariantDraft[];
  onChange: (next: VariantDraft[]) => void;
  template: LineTemplate;
  err: (key: string) => string | undefined;
  newKey: () => string;
}) {
  const update = (i: number, patch: Partial<VariantDraft>) => onChange(value.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const single = value.length === 1;
  return (
    <div>
      <div className="hidden grid-cols-[minmax(0,1fr)_200px_110px_80px] gap-4 border-b border-divider pb-3 text-label-sm uppercase text-ink-3 md:grid">
        <span>Nombre</span>
        <span>Precio (COP)</span>
        <span>Stock</span>
        <span />
      </div>
      <ul className="m-0 list-none p-0" data-testid="variants">
        {value.map((v, i) => {
          const errors = [err(`variants.${i}.label`), err(`variants.${i}.priceUnits`), err(`variants.${i}.stock`)].filter(Boolean);
          return (
            <li key={v.key} className="border-b border-divider py-4">
              <div className="grid grid-cols-2 items-center gap-3 md:grid-cols-[minmax(0,1fr)_200px_110px_80px] md:gap-4">
                <input
                  aria-label="Nombre de la presentación"
                  value={v.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder={single ? "Única (opcional)" : PLACEHOLDER[template]}
                  className={cn(cell, "col-span-2 md:col-span-1", err(`variants.${i}.label`) ? "border-accent" : "border-border")}
                />
                <input
                  aria-label="Precio en pesos"
                  inputMode="numeric"
                  value={v.price ? Number(v.price).toLocaleString("es-CO") : ""}
                  onChange={(e) => update(i, { price: digits(e.target.value) })}
                  placeholder="0"
                  className={cn(cell, "tabular-nums", err(`variants.${i}.priceUnits`) ? "border-accent" : "border-border")}
                />
                <input
                  aria-label="Unidades en stock"
                  inputMode="numeric"
                  value={v.stock}
                  onChange={(e) => update(i, { stock: digits(e.target.value) })}
                  className={cn(cell, "text-center tabular-nums", err(`variants.${i}.stock`) ? "border-accent" : "border-border")}
                />
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  disabled={single}
                  className="col-span-2 cursor-pointer justify-self-end text-label-sm uppercase text-ink-3 transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 md:col-span-1"
                >
                  Quitar
                </button>
              </div>
              {errors.length > 0 && (
                <p role="alert" className="m-0 mt-2 text-label-sm uppercase text-accent">
                  {errors[0]}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {err("variants") && (
        <p role="alert" className="m-0 mt-3 text-label-sm uppercase text-accent">
          {err("variants")}
        </p>
      )}
      <button
        type="button"
        onClick={() => onChange([...value, { key: newKey(), id: null, label: "", price: value.at(-1)?.price ?? "", stock: "1" }])}
        disabled={value.length >= 12}
        className="mt-5 cursor-pointer text-label uppercase text-ink-2 transition-colors hover:text-ink disabled:opacity-45"
      >
        + Añadir presentación
      </button>
    </div>
  );
}
