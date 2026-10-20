"use client";
import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/presentation/lib/cn";

/**
 * Primitivas de formulario del panel. Mismo lenguaje que la tienda: radio 0,
 * hairlines, labels en mayúscula con tracking y el magenta solo para estado.
 */
const control =
  "block w-full border bg-transparent px-4 py-3.5 text-meta font-normal text-ink placeholder:text-ink-3 transition-colors duration-200 outline-none focus:border-ink disabled:opacity-45";

export function Field({
  label,
  error,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={htmlFor} className="mb-2.5 text-label uppercase text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="m-0 mt-2 text-label-sm uppercase text-accent">
          {error}
        </p>
      ) : hint ? (
        <p className="m-0 mt-2 text-legal text-ink-2">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = Omit<ComponentPropsWithoutRef<"input">, "className"> & { label: string; error?: string; hint?: ReactNode; className?: string };

export function TextInput({ label, error, hint, className, id, ...rest }: InputProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} className={className} htmlFor={fieldId}>
      <input id={fieldId} aria-invalid={error ? true : undefined} className={cn(control, error ? "border-accent" : "border-border")} {...rest} />
    </Field>
  );
}

type TextAreaProps = Omit<ComponentPropsWithoutRef<"textarea">, "className"> & { label: string; error?: string; hint?: ReactNode; className?: string };

export function TextArea({ label, error, hint, className, id, rows = 5, ...rest }: TextAreaProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} className={className} htmlFor={fieldId}>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(control, "resize-y leading-relaxed", error ? "border-accent" : "border-border")}
        {...rest}
      />
    </Field>
  );
}

type SelectProps = Omit<ComponentPropsWithoutRef<"select">, "className"> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
};

export function Select({ label, error, hint, className, id, options, ...rest }: SelectProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} className={className} htmlFor={fieldId}>
      <div className="relative">
        <select
          id={fieldId}
          aria-invalid={error ? true : undefined}
          className={cn(control, "cursor-pointer appearance-none pr-10 [&>option]:bg-surface", error ? "border-accent" : "border-border")}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-2" width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <polyline points="2,5 7,10 12,5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </div>
    </Field>
  );
}

/** Interruptor cuadrado (radio 0). */
export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <label htmlFor={id} className="block cursor-pointer text-label uppercase text-ink">
          {label}
        </label>
        {description ? <p className="m-0 mt-1.5 text-legal text-ink-2">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 cursor-pointer border transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-45",
          checked ? "border-accent bg-accent" : "border-border-strong bg-transparent hover:border-ink",
        )}
      >
        <span
          aria-hidden="true"
          className={cn("absolute top-[3px] h-4 w-4 transition-all duration-300 ease-[var(--ease-bar)]", checked ? "left-[23px] bg-ink" : "left-[3px] bg-ink-2")}
        />
      </button>
    </div>
  );
}

/** Selector de opciones excluyentes en línea (p. ej. Pruebas / Producción). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col">
      <span className="mb-2.5 text-label uppercase text-ink-2">{label}</span>
      <div className="flex">
        {options.map((o, i) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "flex-1 cursor-pointer border px-5 py-3.5 text-label uppercase transition-colors duration-200",
                i > 0 && "-ml-px",
                active ? "relative z-10 border-ink bg-ink text-bg" : "border-border text-ink-2 hover:text-ink",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Encabezado numerado de sección, al estilo editorial de la tienda. */
export function FormSection({ n, title, aside, children }: { n: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-divider pb-12 pt-6">
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <h2 className="m-0 flex items-baseline gap-4 text-label-lg uppercase text-ink">
          <span className="text-ink-3">{n}</span>
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}
