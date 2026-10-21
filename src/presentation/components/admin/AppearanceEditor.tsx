"use client";
import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import type { ActionResult } from "@/application/dto/admin.dto";
import { DEFAULT_APPEARANCE, FONT_KEYS, FONT_LABELS, PRESETS, PRESET_KEYS, contrastChecks, type FontKey, type StoreAppearanceInput, type ThemeColors } from "@/application/dto/appearance.dto";
import type { AppearanceEditorState } from "@/application/use-cases/admin/appearance";
import { HEX_COLOR } from "@/application/lib/contrast";
import { fontVar } from "@/application/lib/theme-css";
import { Button } from "@/presentation/components/primitives/Button";
import { cn } from "@/presentation/lib/cn";
import { FormSection } from "./fields";

const PREVIEW_PATH = "/admin/vista-previa/apariencia";
const formatDate = (iso: string) => new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });

const COLOR_FIELDS: Array<{ key: keyof ThemeColors; label: string; hint: string }> = [
  { key: "accent", label: "Acento", hint: "Botones, contadores y detalles" },
  { key: "bg", label: "Fondo", hint: "Fondo de toda la tienda" },
  { key: "surface", label: "Superficie", hint: "Tarjetas, paneles y bloques" },
  { key: "ink", label: "Texto", hint: "Títulos y texto principal" },
  { key: "ink2", label: "Texto secundario", hint: "Descripciones y apoyos" },
  { key: "ink3", label: "Texto tenue", hint: "Notas y detalles menores" },
  { key: "divider", label: "Líneas", hint: "Divisiones (al 30 %)" },
  { key: "border", label: "Bordes", hint: "Campos y botones (al 40–50 %)" },
];

type Status = { kind: "idle" } | { kind: "saved" } | { kind: "loaded"; label: string } | { kind: "error"; message: string };

/** Variables CSS locales para pintar la muestra con el tema en edición (sin tocar el panel). */
function scopedVars(a: StoreAppearanceInput): CSSProperties {
  const c = a.colors;
  return {
    "--color-accent": c.accent,
    "--color-accent-hover": `color-mix(in srgb, ${c.accent} 90%, #000)`,
    "--color-bg": c.bg,
    "--color-surface": c.surface,
    "--color-ink": c.ink,
    "--color-ink-2": c.ink2,
    "--color-ink-3": c.ink3,
    "--color-divider": `color-mix(in srgb, ${c.divider} 30%, transparent)`,
    "--color-border": `color-mix(in srgb, ${c.border} 40%, transparent)`,
    "--color-border-strong": `color-mix(in srgb, ${c.border} 50%, transparent)`,
    "--font-sans": `var(${fontVar(a.fonts.body)}), system-ui, sans-serif`,
    "--font-display": `var(${fontVar(a.fonts.display)}), system-ui, sans-serif`,
    fontFamily: "var(--font-sans)",
  } as CSSProperties;
}

function ColorField({ label, hint, value, onChange, error, testId }: { label: string; hint: string; value: string; onChange: (v: string) => void; error?: string; testId: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-label uppercase text-ink-2">{label}</span>
      <div className={cn("flex items-center border", error ? "border-accent" : "border-border")}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label}: selector`} className="h-12 w-12 shrink-0 cursor-pointer border-0 bg-transparent p-1.5" />
        <input
          value={text}
          onChange={(e) => {
            const v = e.target.value.trim();
            setText(v);
            if (HEX_COLOR.test(v)) onChange(v.toLowerCase());
          }}
          maxLength={7}
          spellCheck={false}
          aria-label={`${label}: hex`}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-meta uppercase text-ink outline-none"
          data-testid={testId}
        />
      </div>
      <span className={cn("text-legal", error ? "text-accent" : "text-ink-3")}>{error ?? hint}</span>
    </div>
  );
}

/**
 * Ajustes › Apariencia: colores del tema oscuro (presets o personalizados,
 * con contraste WCAG AA a la vista) y tipografía de un catálogo cerrado.
 * Mismo flujo que Identidad: vista previa, publicar y versiones.
 */
export function AppearanceEditor({
  initial,
  actions,
}: {
  initial: AppearanceEditorState;
  actions: { save: (input: StoreAppearanceInput, mode: "draft" | "publish") => Promise<ActionResult>; discard: () => Promise<ActionResult> };
}) {
  const [draft, setDraft] = useState<StoreAppearanceInput>(initial.input);
  const [saved, setSaved] = useState(() => JSON.stringify(initial.input));
  const [hasDraft, setHasDraft] = useState(initial.hasDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== saved;
  const checks = useMemo(() => contrastChecks(draft.colors), [draft.colors]);
  const contrastOk = checks.every((c) => c.ok);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setColor = (k: keyof ThemeColors, v: string) => {
    setDraft((d) => ({ ...d, preset: "personalizado", colors: { ...d.colors, [k]: v } }));
    setStatus({ kind: "idle" });
  };
  const applyPreset = (key: (typeof PRESET_KEYS)[number]) => {
    setDraft((d) => ({ ...d, preset: key, colors: { ...PRESETS[key].colors } }));
    setStatus({ kind: "idle" });
  };
  const setFont = (k: "display" | "body", v: FontKey) => {
    setDraft((d) => ({ ...d, fonts: { ...d.fonts, [k]: v } }));
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

  const load = (input: StoreAppearanceInput, label: string) => {
    if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Cargar de todos modos?")) return;
    setDraft({ preset: input.preset, colors: { ...input.colors }, fonts: { ...input.fonts } });
    setErrors({});
    setStatus({ kind: "loaded", label });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [text, tone] = pending
    ? ["Guardando…", "text-ink-2"]
    : status.kind === "error"
      ? [status.message, "text-accent"]
      : status.kind === "loaded"
        ? [`${status.label} cargada · revisa y publica`, "text-ink-2"]
        : !contrastOk
          ? ["El contraste no cumple WCAG AA: ajusta los colores marcados", "text-accent"]
          : dirty
            ? ["Cambios sin guardar", "text-ink-2"]
            : hasDraft
              ? ["Borrador sin publicar", "text-ink-2"]
              : status.kind === "saved"
                ? ["Publicada en la tienda", "text-ink"]
                : ["Publicada · sin cambios", "text-ink-3"];

  const errorFor = (k: keyof ThemeColors) => {
    const failing = checks.find((c) => !c.ok && c.id.split("-").includes(k));
    return errors[`colors.${k}`] ?? (failing ? `${failing.ratio.toFixed(2)}:1 (mín. ${failing.min}:1)` : undefined);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-[minmax(0,1fr)] pb-24" data-testid="appearance-editor">
      <FormSection n="01" title="Colores" aside={<span className="text-legal text-ink-3">Tema oscuro · contraste WCAG AA</span>}>
        <div className="flex flex-col gap-8">
          <div role="radiogroup" aria-label="Presets" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {PRESET_KEYS.map((key) => {
              const p = PRESETS[key];
              const active = draft.preset === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => applyPreset(key)}
                  data-testid={`preset-${key}`}
                  className={cn("flex cursor-pointer flex-col gap-3 border p-4 text-left transition-colors", active ? "border-ink" : "border-border hover:border-ink")}
                  style={{ background: p.colors.bg }}
                >
                  <span className="flex gap-1.5" aria-hidden="true">
                    {[p.colors.accent, p.colors.surface, p.colors.ink, p.colors.ink2].map((c, i) => (
                      <span key={i} className="h-5 w-5 border border-border" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="text-label uppercase" style={{ color: p.colors.ink }}>
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="m-0 text-small text-ink-2">
            {draft.preset === "personalizado" ? "Personalizado: partiste de un preset y cambiaste colores." : `Preset: ${PRESETS[draft.preset as keyof typeof PRESETS]?.label ?? draft.preset}.`} Toca un color para ajustarlo.
          </p>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {COLOR_FIELDS.map((f) => (
              <ColorField key={f.key} label={f.label} hint={f.hint} value={draft.colors[f.key]} onChange={(v) => setColor(f.key, v)} error={errorFor(f.key)} testId={`color-${f.key}`} />
            ))}
          </div>
          <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-px border border-divider bg-divider p-0 md:grid-cols-2" aria-label="Contraste" data-testid="contrast-checks">
            {checks.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 bg-bg px-5 py-3.5 text-small">
                <span className="text-ink-2">{c.label}</span>
                <span className={cn("shrink-0 tabular-nums", c.ok ? "text-ink" : "text-accent")}>
                  {c.ratio.toFixed(2)}:1 {c.ok ? "✓" : `✗ mín. ${c.min}:1`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </FormSection>

      <FormSection n="02" title="Tipografía" aside={<span className="text-legal text-ink-3">Catálogo cerrado de Google Fonts</span>}>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-2">
          {(["display", "body"] as const).map((k) => (
            <label key={k} className="flex flex-col gap-2.5">
              <span className="text-label uppercase text-ink-2">{k === "display" ? "Títulos" : "Cuerpo, rótulos y botones"}</span>
              <select
                value={draft.fonts[k]}
                onChange={(e) => setFont(k, e.target.value as FontKey)}
                className="block w-full border border-border bg-bg px-4 py-3.5 text-meta text-ink outline-none focus:border-ink"
                data-testid={`font-${k}`}
              >
                {FONT_KEYS.map((f) => (
                  <option key={f} value={f}>
                    {FONT_LABELS[f].label} {FONT_LABELS[f].kind === "serif" ? "· serif" : ""}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </FormSection>

      <FormSection n="03" title="Muestra" aside={<span className="text-legal text-ink-3">Así se verán los colores y las fuentes</span>}>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-0 border border-divider bg-bg p-6 text-ink md:p-10" style={scopedVars(draft)} data-testid="appearance-sample">
          <span className="text-kicker uppercase text-ink-2">Recién llegado</span>
          <h3 className="mb-0 mt-3 text-h2-sm uppercase [overflow-wrap:anywhere]">Piezas de las grandes casas</h3>
          <p className="mb-0 mt-3 max-w-[52ch] text-body text-ink-2">Relojes, joyas y perfumes verificados uno por uno. Texto secundario sobre el fondo.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="sm">Comprar ahora</Button>
            <Button size="sm" variant="secondary">
              Añadir a la bolsa
            </Button>
            <span className="text-legal text-ink-3">Nota tenue</span>
          </div>
          <div className="mt-6 border-t border-divider bg-surface p-4 text-small">Una superficie con texto · $ 16.900.000 COP</div>
        </div>
      </FormSection>

      <FormSection n="04" title="Versiones" aside={<span className="text-legal text-ink-3">Las últimas publicaciones</span>}>
        <div className="flex flex-col gap-4" data-testid="appearance-versions">
          <p className="m-0 text-small text-ink-2">
            {initial.publishedAt ? <>Publicada por última vez el {formatDate(initial.publishedAt)}.</> : <>La tienda usa la apariencia de fábrica: todavía no se ha publicado nada desde el panel.</>}
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
              <span className="text-small text-ink-2">Apariencia de fábrica (Archivo)</span>
              <button type="button" onClick={() => load(DEFAULT_APPEARANCE, "Apariencia de fábrica")} className="cursor-pointer text-label-sm uppercase text-ink-2 hover:text-ink" data-testid="appearance-factory">
                Cargar en el editor
              </button>
            </li>
            {initial.history.map((v) => (
              <li key={v.at} className="flex items-center justify-between gap-4 bg-bg px-5 py-3.5">
                <span className="text-small text-ink-2">{formatDate(v.at)}</span>
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
            <span className={cn("h-1.5 w-1.5 shrink-0", status.kind === "error" || dirty || !contrastOk ? "bg-accent" : status.kind === "saved" ? "bg-ink" : "bg-ink-3")} aria-hidden="true" />
            <span className="truncate">{text}</span>
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onPreview} disabled={pending || !contrastOk} data-testid="appearance-preview-open">
              Vista previa ↗
            </Button>
            <Button type="submit" size="sm" disabled={pending || !contrastOk || (!dirty && !hasDraft)} data-testid="appearance-publish">
              {pending ? "Guardando…" : "Publicar"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
