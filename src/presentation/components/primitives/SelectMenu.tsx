"use client";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/presentation/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

/** Sin tildes ni mayúsculas: "bogota" encuentra "Bogotá D.C.". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/** La opción que corresponde a un texto escrito o autocompletado por el navegador. */
export function matchOption(options: readonly SelectOption[], text: string): SelectOption | undefined {
  const q = fold(text);
  if (!q) return undefined;
  return options.find((o) => fold(o.label) === q || fold(o.value) === q) ?? (q.length >= 3 ? options.find((o) => fold(o.label).startsWith(q)) : undefined);
}

/**
 * Selector con la estética de la tienda (lista propia en vez del menú del
 * sistema, que en temas oscuros puede salir blanco sobre blanco). Patrón
 * combobox de ARIA: flechas, Enter, Escape, Inicio/Fin.
 * `searchable`: se escribe para filtrar (y acepta el autocompletado del
 * navegador, que se resuelve a una opción al salir del campo).
 */
export function SelectMenu({
  id,
  value,
  options,
  onChange,
  placeholder = "Elige una opción",
  searchable = false,
  invalid,
  describedBy,
  autoComplete,
  name,
  className,
}: {
  id?: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  invalid?: boolean;
  describedBy?: string;
  autoComplete?: string;
  name?: string;
  className?: string;
}) {
  const auto = useId();
  const baseId = id ?? auto;
  const listId = `${baseId}-list`;
  const selected = options.find((o) => o.value === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  // Abre hacia arriba si abajo no cabe la lista (p. ej. el campo está al final de la pantalla).
  const [up, setUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const shown = useMemo(() => {
    const q = fold(query);
    return searchable && q ? options.filter((o) => fold(o.label).includes(q)) : options;
  }, [options, query, searchable]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  // La opción activa siempre a la vista dentro de la lista.
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const show = () => {
    const i = shown.findIndex((o) => o.value === value);
    setActive(Math.max(0, i));
    const r = root.current?.getBoundingClientRect();
    setUp(!!r && window.innerHeight - r.bottom < 300 && r.top > window.innerHeight - r.bottom);
    setOpen(true);
  };
  const choose = (o: SelectOption | undefined) => {
    if (o) onChange(o.value);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const last = shown.length - 1;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return show();
      setActive((i) => (e.key === "ArrowDown" ? Math.min(last, i + 1) : Math.max(0, i - 1)));
    } else if (e.key === "Home" && open) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && open) {
      e.preventDefault();
      setActive(last);
    } else if (e.key === "Enter" || (!searchable && e.key === " ")) {
      e.preventDefault();
      if (open) choose(shown[active]);
      else show();
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setQuery("");
      setOpen(false);
    } else if (e.key === "Tab" && open) {
      setQuery("");
      setOpen(false);
    } else if (!searchable && e.key.length === 1 && /\S/.test(e.key)) {
      // Escribir una letra salta a la primera opción que empieza por ella.
      const i = options.findIndex((o) => fold(o.label).startsWith(fold(e.key)));
      if (i >= 0) {
        if (open) setActive(i);
        else onChange(options[i]!.value);
      }
    }
  };

  const control = cn(
    "block w-full border bg-transparent py-3.5 pl-4 pr-11 text-left text-meta text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink",
    invalid ? "border-accent" : open ? "border-ink" : "border-border",
    className,
  );
  const aria = {
    role: "combobox" as const,
    "aria-expanded": open,
    "aria-controls": listId,
    "aria-haspopup": "listbox" as const,
    "aria-activedescendant": open && shown[active] ? `${baseId}-opt-${active}` : undefined,
    "aria-invalid": invalid ? true : undefined,
    "aria-describedby": describedBy,
  };

  return (
    <div ref={root} className="relative">
      {searchable ? (
        <input
          {...aria}
          id={id}
          name={name}
          autoComplete={autoComplete}
          aria-autocomplete="list"
          className={control}
          value={open ? query : (selected?.label ?? query)}
          placeholder={selected?.label ?? placeholder}
          onFocus={show}
          onClick={() => !open && show()}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
            // El autocompletado del navegador escribe el nombre completo de una vez.
            const exact = options.find((o) => fold(o.label) === fold(e.target.value));
            if (exact && !open) choose(exact);
          }}
          onBlur={() => {
            if (query) choose(matchOption(options, query));
            else setOpen(false);
          }}
          onKeyDown={onKeyDown}
        />
      ) : (
        <button type="button" {...aria} id={id} className={cn(control, "cursor-pointer")} onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKeyDown}>
          <span className={selected ? undefined : "text-ink-3"}>{selected?.label ?? placeholder}</span>
        </button>
      )}
      <svg className={cn("pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-2 transition-transform", open && "rotate-180")} width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
        <path d="M1 1.5 6 6.5l5-5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <ul
        ref={list}
        id={listId}
        role="listbox"
        hidden={!open}
        className={cn("absolute inset-x-0 z-30 m-0 max-h-72 list-none overflow-y-auto border border-border-strong bg-surface-elevated p-1 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)]", up ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]")}
      >
        {shown.length === 0 && <li className="px-3.5 py-3 text-small text-ink-3">Sin resultados</li>}
        {shown.map((o, i) => {
          const isSelected = o.value === value;
          return (
            <li
              key={o.value}
              id={`${baseId}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={isSelected}
              // preventDefault: el campo está dentro de un <label>, que si no reenvía el clic y reabre la lista.
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                choose(o);
              }}
              onPointerMove={() => setActive(i)}
              className={cn("flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-small text-ink-2", i === active && "bg-surface text-ink", isSelected && "text-ink")}
            >
              {o.label}
              {isSelected && (
                <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true" className="shrink-0 text-accent">
                  <path d="M1 5.2 4.3 8.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
