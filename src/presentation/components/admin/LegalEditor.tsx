"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { LegalEditorDto, LegalPageInput, LegalVersionDto } from "@/application/dto/legal.dto";
import { fillTokens, parseSections, unknownTokens, type LegalToken } from "@/application/lib/legal-markdown";
import { Button } from "@/presentation/components/primitives/Button";
import { cn } from "@/presentation/lib/cn";
import { FormSection, TextArea, TextInput } from "./fields";

type Content = Omit<LegalPageInput, "major">;
type Status = { kind: "idle" } | { kind: "published"; version: string } | { kind: "loaded"; version: string } | { kind: "error"; message: string };

const PREVIEW = (slug: string) => `/admin/vista-previa/legal/${slug}`;
const formatDate = (iso: string) => new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
const formatDay = (day: string) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

const CHEATSHEET: Array<[string, string]> = [
  ["## Título {#ancla}", "Nueva sección (el ancla es opcional)"],
  ["Texto en una o varias líneas", "Párrafo"],
  ["- elemento", "Lista"],
  ["1. elemento", "Lista numerada"],
  ["> texto", "Nota destacada"],
  ["| A | B |\n| --- | --- |\n| 1 | 2 |", "Tabla"],
  ["::: pasos\nTítulo — texto\n:::", "Pasos numerados"],
  ["::: datos\nEtiqueta: valor\n:::", "Datos en dos columnas"],
  ["**negrita**  [texto](/garantia)", "En línea"],
];

/**
 * Editor de una página legal: metadatos y contenido en markdown sencillo.
 * Se revisa mientras se escribe; "Vista previa" guarda un borrador y lo abre,
 * "Publicar" lo lleva a la tienda con la siguiente versión.
 */
export function LegalEditor({
  initial,
  actions,
}: {
  initial: LegalEditorDto;
  actions: {
    save: (input: LegalPageInput, mode: "draft" | "publish") => Promise<ActionResult<{ version: string | null }>>;
    discard: () => Promise<ActionResult>;
    reset: () => Promise<ActionResult>;
  };
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Content>(initial.content);
  const [saved, setSaved] = useState(JSON.stringify(initial.content));
  const [hasDraft, setHasDraft] = useState(initial.hasDraft);
  const [major, setMajor] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== saved;

  const values = useMemo(() => Object.fromEntries(initial.tokens.map((t) => [t.token, t.value])) as Record<LegalToken, string>, [initial.tokens]);
  // Revisión en vivo con el mismo código que valida el servidor.
  const check = useMemo(() => {
    const unknown = [draft.kicker, draft.title, draft.lead, draft.description, draft.body].flatMap(unknownTokens);
    const parsed = parseSections(fillTokens(draft.body, values));
    return { sections: parsed.sections.length, issues: [...parsed.issues.map((i) => (i.line ? `Línea ${i.line}: ${i.message}` : i.message)), ...[...new Set(unknown)].map((t) => `Ficha desconocida: {${t}}`)] };
  }, [draft, values]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof Content>(k: K, v: Content[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (status.kind !== "loaded") setStatus({ kind: "idle" });
  };

  async function persist(mode: "draft" | "publish"): Promise<boolean> {
    const res = await actions.save({ ...draft, major }, mode);
    if (!res.ok) {
      setErrors(res.fieldErrors ?? {});
      setStatus({ kind: "error", message: res.error });
      return false;
    }
    setErrors({});
    setSaved(JSON.stringify(draft));
    setHasDraft(mode === "draft");
    setStatus(mode === "publish" && res.data.version ? { kind: "published", version: res.data.version } : { kind: "idle" });
    return true;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      if (await persist("publish")) {
        setMajor(false);
        router.refresh();
      }
    });
  }

  function onPreview() {
    // La pestaña se abre ya (si se abre después de esperar, el navegador la bloquea).
    const tab = window.open("about:blank", "_blank");
    start(async () => {
      const ok = await persist("draft");
      if (ok && tab) tab.location.href = `${PREVIEW(initial.slug)}?t=${Date.now()}`;
      else tab?.close();
    });
  }

  function confirmThen(question: string, run: () => Promise<ActionResult>) {
    if (!window.confirm(question)) return;
    start(async () => {
      const res = await run();
      if (!res.ok) return setStatus({ kind: "error", message: res.error });
      window.location.reload();
    });
  }

  function loadVersion(v: LegalVersionDto) {
    if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Cargar esta versión de todos modos?")) return;
    setDraft(v.content);
    setErrors({});
    setStatus({ kind: "loaded", version: v.version });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const nextVersion = major ? initial.next.major : initial.next.minor;
  const [text, tone] = pending
    ? ["Guardando…", "text-ink-2"]
    : status.kind === "error"
      ? [status.message, "text-accent"]
      : status.kind === "published"
        ? [`Publicada la versión ${status.version}`, "text-ink"]
        : status.kind === "loaded"
          ? [`Versión ${status.version} cargada · revisa y publica`, "text-ink-2"]
          : dirty
            ? ["Cambios sin guardar", "text-ink-2"]
            : hasDraft
              ? ["Borrador sin publicar", "text-ink-2"]
              : [initial.current.source === "fabrica" ? `Texto de fábrica · versión ${initial.current.version}` : `Publicado · versión ${initial.current.version}`, "text-ink-3"];

  return (
    <form onSubmit={onSubmit} noValidate className="pb-24" data-testid="legal-editor">
      <div className="grid gap-x-14 gap-y-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <FormSection n="01" title="Encabezado">
            <div className="grid gap-6 md:grid-cols-2">
              <TextInput label="Antetítulo" value={draft.kicker} onChange={(e) => set("kicker", e.target.value)} maxLength={40} error={errors.kicker} />
              <TextInput label="Título" value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={60} error={errors.title} />
              <TextArea className="md:col-span-2" rows={3} label="Entradilla" value={draft.lead} onChange={(e) => set("lead", e.target.value)} maxLength={400} error={errors.lead} />
              <TextArea
                className="md:col-span-2"
                rows={3}
                label="Descripción para buscadores"
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={300}
                error={errors.description}
                hint={`${draft.description.length}/300 · aparece en Google y al compartir el enlace.`}
              />
            </div>
          </FormSection>

          <FormSection n="02" title="Contenido" aside={<span className="text-legal text-ink-3">{check.sections} secciones</span>}>
            <label htmlFor="legal-body" className="sr-only">
              Contenido
            </label>
            <textarea
              id="legal-body"
              value={draft.body}
              onChange={(e) => set("body", e.target.value)}
              rows={30}
              spellCheck
              aria-invalid={check.issues.length > 0 || Boolean(errors.body)}
              data-testid="legal-body"
              className={cn(
                "block w-full resize-y border bg-transparent px-4 py-3.5 font-mono text-[13px] leading-[1.7] text-ink outline-none transition-colors focus:border-ink",
                check.issues.length || errors.body ? "border-accent" : "border-border",
              )}
            />
            {(check.issues.length > 0 || errors.body) && (
              <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0" role="alert" data-testid="legal-issues">
                {(check.issues.length ? check.issues : [errors.body!]).map((m) => (
                  <li key={m} className="text-label-sm uppercase text-accent">
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </FormSection>

          <FormSection n="03" title="Versiones">
            <div className="flex flex-col gap-4" data-testid="legal-versions">
              <p className="m-0 text-small text-ink-2">
                En la tienda: versión <strong className="font-medium text-ink">{initial.current.version}</strong>, vigente desde el {formatDay(initial.current.effective)}
                {initial.current.source === "fabrica" ? " (texto de fábrica)." : "."}
                {hasDraft && (
                  <>
                    {" "}Hay un borrador sin publicar.{" "}
                    <button type="button" onClick={() => confirmThen("¿Descartar el borrador? El editor vuelve a lo publicado.", actions.discard)} className="cursor-pointer text-ink underline decoration-accent underline-offset-4 hover:text-accent">
                      Descartar borrador
                    </button>
                  </>
                )}
              </p>
              {initial.history.length > 0 && (
                <ul className="m-0 flex list-none flex-col gap-px border border-divider bg-divider p-0">
                  {initial.history.map((v) => (
                    <li key={`${v.version}-${v.publishedAt}`} className="flex items-center justify-between gap-4 bg-bg px-5 py-3.5">
                      <span className="text-small text-ink-2">
                        Versión {v.version} · {formatDate(v.publishedAt)}
                      </span>
                      <button type="button" onClick={() => loadVersion(v)} className="cursor-pointer text-label-sm uppercase text-ink-2 hover:text-ink">
                        Cargar en el editor
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {initial.current.source === "publicado" && (
                <button
                  type="button"
                  onClick={() => confirmThen(`¿Volver al texto de fábrica? Se publica como la versión ${initial.next.minor} y lo publicado queda en el historial.`, actions.reset)}
                  className="w-fit cursor-pointer text-label-sm uppercase text-ink-3 hover:text-accent"
                  data-testid="legal-reset"
                >
                  Volver al texto de fábrica
                </button>
              )}
            </div>
          </FormSection>
        </div>

        <aside className="flex flex-col gap-8 pt-6 xl:sticky xl:top-8 xl:self-start">
          <div>
            <span className="mb-3 block text-label uppercase text-ink-2">Cómo se escribe</span>
            <dl className="m-0 flex flex-col gap-px border border-divider bg-divider">
              {CHEATSHEET.map(([code, what]) => (
                <div key={what} className="flex flex-col gap-1 bg-bg px-4 py-3">
                  <dt className="whitespace-pre font-mono text-[12px] leading-[1.6] text-ink">{code}</dt>
                  <dd className="m-0 text-legal text-ink-3">{what}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <span className="mb-3 block text-label uppercase text-ink-2">Fichas con datos de la empresa</span>
            <p className="m-0 mb-3 text-legal text-ink-3">Se reemplazan al publicar: si cambias el correo en Legales › Datos de la empresa, se actualiza en todas las páginas.</p>
            <dl className="m-0 flex flex-col gap-2">
              {initial.tokens.map((t) => (
                <div key={t.token} className="flex flex-col">
                  <dt className="font-mono text-[12px] text-ink">{`{${t.token}}`}</dt>
                  <dd className="m-0 truncate text-legal text-ink-3" title={t.value}>
                    {t.value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>

      <div className="backdrop-glass fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-glass-deep lg:left-[248px]">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-10 lg:px-14">
          <p className={cn("m-0 flex min-w-0 items-center gap-2.5 text-label-sm uppercase", tone)} role="status" aria-live="polite">
            <span className={cn("h-1.5 w-1.5 shrink-0", status.kind === "error" || dirty ? "bg-accent" : "bg-ink-3")} aria-hidden="true" />
            <span className="truncate">{text}</span>
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-label-sm uppercase text-ink-2">
              <input type="checkbox" checked={major} onChange={(e) => setMajor(e.target.checked)} className="accent-accent" data-testid="legal-major" />
              Cambio importante
            </label>
            <Button variant="secondary" size="sm" onClick={onPreview} disabled={pending} data-testid="legal-preview">
              Vista previa ↗
            </Button>
            <Button type="submit" size="sm" disabled={pending || check.issues.length > 0 || (!dirty && !hasDraft && status.kind !== "loaded")} data-testid="legal-publish">
              {pending ? "Guardando…" : `Publicar v${nextVersion}`}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
