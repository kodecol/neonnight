"use client";
import { useId, useState } from "react";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { BrandDto } from "@/application/dto/brand.dto";
import { brandKey } from "@/domain/entities/brand";
import { Field } from "./fields";

/**
 * Marca del producto: se elige de la lista del panel › Marcas (con búsqueda
 * del navegador). Si se escribe una que no existe, se ofrece crearla ahí mismo.
 */
export function BrandPicker({
  value,
  onChange,
  brands,
  onCreated,
  create,
  error,
  placeholder,
}: {
  value: string;
  onChange: (name: string) => void;
  brands: readonly string[];
  onCreated: (name: string) => void;
  create: (name: string) => Promise<ActionResult<BrandDto>>;
  error?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const typed = value.trim();
  const match = typed ? brands.find((b) => brandKey(b) === brandKey(typed)) : undefined;

  async function onCreate() {
    setBusy(true);
    setCreateError(null);
    const res = await create(typed);
    setBusy(false);
    if (!res.ok) return setCreateError(res.error);
    onCreated(res.data.name);
    onChange(res.data.name);
  }

  return (
    <Field
      label="Marca"
      htmlFor={id}
      error={createError ?? error}
      hint={
        typed && !match ? (
          <button type="button" onClick={() => void onCreate()} disabled={busy} className="cursor-pointer text-ink underline decoration-accent underline-offset-4 hover:text-accent disabled:opacity-45" data-testid="brand-create">
            {busy ? "Creando…" : `Crear marca «${typed}»`}
          </button>
        ) : (
          "Elige una de la lista o escribe una nueva."
        )
      }
    >
      <input
        id={id}
        list={`${id}-brands`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // Al salir, se ajusta al nombre exacto de la marca (mayúsculas y tildes).
        onBlur={() => match && match !== value && onChange(match)}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        data-testid="brand-picker"
        className={`block w-full border bg-transparent px-4 py-3.5 text-meta font-normal text-ink outline-none transition-colors duration-200 placeholder:text-ink-3 focus:border-ink ${error ? "border-accent" : "border-border"}`}
      />
      <datalist id={`${id}-brands`}>
        {brands.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
    </Field>
  );
}
