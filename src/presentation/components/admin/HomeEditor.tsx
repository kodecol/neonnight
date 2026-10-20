"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/application/dto/admin.dto";
import { BAND_POSITIONS, type BandPosition, type HomeEditorDefaults, type HomeSettingsInput, type SiteMediaDto } from "@/application/dto/home.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { SmartImage as Image } from "@/presentation/components/primitives/SmartImage";
import { cn } from "@/presentation/lib/cn";
import { FormSection, Segmented, TextArea, TextInput } from "./fields";
import { SiteMediaLibrary, type SiteMediaActions } from "./SiteMediaLibrary";
import { SocialEditor, TestimonialsEditor, TrustEditor } from "./HomeBlocksEditor";
import type { HomeEditorState, HomeEditorVersion } from "@/application/use-cases/admin/home";
import { HOME_BLOCKS, resolveLayout } from "@/application/ports/home-settings";

type BlockKey = "trust" | "testimonials" | "social";
type Layout = NonNullable<HomeSettingsInput["layout"]>;

const PREVIEW_PATH = "/admin/vista-previa";
const formatDate = (iso: string) => new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });

type Status = { kind: "idle" } | { kind: "saved" } | { kind: "loaded"; at: string } | { kind: "error"; message: string };

/** Elige un medio de la biblioteca (o ninguno) para un lugar de la home. */
function MediaPicker({
  items,
  value,
  onChange,
  allowVideo,
  noneLabel,
  testId,
}: {
  items: SiteMediaDto[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowVideo: boolean;
  noneLabel?: string;
  testId: string;
}) {
  const options = items.filter((m) => allowVideo || m.kind === "image");
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" role="radiogroup" data-testid={testId}>
      {noneLabel && (
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          onClick={() => onChange(null)}
          className={cn(
            "flex aspect-video w-36 shrink-0 cursor-pointer items-center justify-center border px-3 text-center text-label-sm uppercase transition-colors",
            value === null ? "border-accent text-ink" : "border-dashed border-border text-ink-3 hover:border-ink",
          )}
        >
          {noneLabel}
        </button>
      )}
      {options.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={value === m.id}
          aria-label={m.alt || (m.kind === "video" ? "Video" : "Foto")}
          onClick={() => onChange(m.id)}
          className={cn("relative aspect-video w-36 shrink-0 cursor-pointer overflow-hidden border-2 bg-surface transition-colors", value === m.id ? "border-accent" : "border-transparent hover:border-border-strong")}
        >
          <Image src={m.kind === "video" ? (m.poster ?? m.src) : m.src} alt="" fill sizes="144px" className="object-cover" />
          {m.kind === "video" && <span className="absolute bottom-1 left-1 bg-glass px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">Video</span>}
        </button>
      ))}
      {options.length === 0 && <p className="m-0 self-center text-legal text-ink-3">Sube {allowVideo ? "una foto o un video" : "una foto"} en la biblioteca de arriba.</p>}
    </div>
  );
}

const POSITION_LABEL: Record<BandPosition, string> = { arriba: "Arriba", centro: "Centro", abajo: "Abajo" };

/**
 * Sección "Inicio" del panel: biblioteca de medios del sitio y el contenido
 * editable de la home. Lo vacío usa el texto por defecto. "Vista previa"
 * guarda un borrador y abre la home con él; "Publicar" lo lleva a la tienda.
 * Las últimas publicaciones se pueden volver a cargar.
 */
export function HomeEditor({
  initial,
  media: initialMedia,
  featured,
  defaults,
  links,
  videosEnabled,
  actions,
}: {
  initial: HomeEditorState;
  media: SiteMediaDto[];
  featured: { name: string; href: string; editHref: string } | null;
  defaults: {
    bandTitle: string;
    bandImage: string;
    heroCta: string;
    trustKicker: string;
    testimonials: { kicker: string; title: string; note: string };
    social: { kicker: string; title: string; body: string };
  };
  links: Array<{ href: string; label: string }>;
  videosEnabled: boolean;
  actions: SiteMediaActions & {
    save: (input: HomeSettingsInput, mode: "draft" | "publish") => Promise<ActionResult>;
    discard: () => Promise<ActionResult>;
    listMedia: () => Promise<ActionResult<SiteMediaDto[]>>;
  };
}) {
  const router = useRouter();
  const [media, setMedia] = useState(initialMedia);
  const [draft, setDraft] = useState<Pick<HomeSettingsInput, "hero" | "band">>({ hero: initial.hero, band: initial.band });
  // Los bloques se muestran siempre con su contenido actual, pero solo se guardan si se editaron
  // (un bloque nunca editado sigue los textos del código).
  const [blocks, setBlocks] = useState<HomeEditorDefaults>(initial.defaults);
  const [touched, setTouched] = useState<Record<BlockKey | "layout", boolean>>({
    trust: initial.trust !== null,
    testimonials: initial.testimonials !== null,
    social: initial.social !== null,
    layout: initial.layout !== null,
  });
  const [layout, setLayout] = useState<Layout>(() => resolveLayout(initial.layout).map((b) => ({ ...b })));
  const payload = (): HomeSettingsInput => ({
    ...draft,
    trust: touched.trust ? blocks.trust : null,
    testimonials: touched.testimonials ? blocks.testimonials : null,
    social: touched.social ? blocks.social : null,
    layout: touched.layout ? layout : null,
  });
  const [saved, setSaved] = useState(() =>
    JSON.stringify({ hero: initial.hero, band: initial.band, trust: initial.trust, testimonials: initial.testimonials, social: initial.social, layout: initial.layout }),
  );
  const [hasDraft, setHasDraft] = useState(initial.hasDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(payload()) !== saved;
  const block =
    <K extends BlockKey>(k: K) =>
    (v: HomeEditorDefaults[K]) => {
      setBlocks((b) => ({ ...b, [k]: v }));
      setTouched((t) => ({ ...t, [k]: true }));
      setStatus({ kind: "idle" });
    };

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const hero = <K extends keyof HomeSettingsInput["hero"]>(k: K, v: HomeSettingsInput["hero"][K]) => {
    setDraft((d) => ({ ...d, hero: { ...d.hero, [k]: v } }));
    setStatus({ kind: "idle" });
  };
  const band = <K extends keyof HomeSettingsInput["band"]>(k: K, v: HomeSettingsInput["band"][K]) => {
    setDraft((d) => ({ ...d, band: { ...d.band, [k]: v } }));
    setStatus({ kind: "idle" });
  };
  const err = (k: string) => errors[k];
  const bandMedia = media.find((m) => m.id === draft.band.mediaId);

  /** Guarda como borrador o publica; devuelve si salió bien. */
  async function persist(mode: "draft" | "publish"): Promise<boolean> {
    const input = payload();
    const res = await actions.save(input, mode);
    if (!res.ok) {
      setErrors(res.fieldErrors ?? {});
      setStatus({ kind: "error", message: res.error });
      return false;
    }
    setErrors({});
    setSaved(JSON.stringify(input));
    setHasDraft(mode === "draft");
    setStatus({ kind: mode === "draft" ? "idle" : "saved" });
    // Los usos de la biblioteca cambian con lo guardado.
    const list = await actions.listMedia();
    if (list.ok) setMedia(list.data);
    return true;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      if (await persist("publish")) router.refresh();
    });
  }

  function onPreview() {
    // La pestaña se abre ya (si se abre después de esperar, el navegador la bloquea).
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

  function loadVersion(v: HomeEditorVersion) {
    if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Cargar esta versión de todos modos?")) return;
    setDraft({ hero: v.input.hero, band: v.input.band });
    setBlocks(v.blocks);
    setTouched({ trust: v.input.trust !== null, testimonials: v.input.testimonials !== null, social: v.input.social !== null, layout: v.input.layout !== null });
    setLayout(resolveLayout(v.input.layout).map((b) => ({ ...b })));
    setErrors({});
    setStatus({ kind: "loaded", at: v.at });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const moveBlock = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= layout.length) return;
    const next = [...layout];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setLayout(next);
    setTouched((t) => ({ ...t, layout: true }));
    setStatus({ kind: "idle" });
  };
  const toggleBlock = (i: number) => {
    setLayout(layout.map((b, j) => (j === i ? { ...b, visible: !b.visible } : b)));
    setTouched((t) => ({ ...t, layout: true }));
    setStatus({ kind: "idle" });
  };

  const [text, tone] = pending
    ? ["Guardando…", "text-ink-2"]
    : status.kind === "error"
      ? [status.message, "text-accent"]
      : status.kind === "loaded"
        ? [`Versión del ${formatDate(status.at)} cargada · revisa y publica`, "text-ink-2"]
        : dirty
          ? ["Cambios sin guardar", "text-ink-2"]
          : hasDraft
            ? ["Borrador sin publicar", "text-ink-2"]
            : status.kind === "saved"
              ? ["Publicado en la home", "text-ink"]
              : ["Publicado · sin cambios", "text-ink-3"];

  return (
    <form onSubmit={onSubmit} noValidate className="pb-24" data-testid="home-editor">
      <FormSection n="01" title="Biblioteca del sitio" aside={<span className="text-legal text-ink-3">Se sube una vez y se usa donde quieras</span>}>
        <SiteMediaLibrary items={media} onItems={setMedia} actions={actions} videosEnabled={videosEnabled} />
      </FormSection>

      <FormSection n="02" title="Hero" aside={<span className="text-legal text-ink-3">Lo primero que se ve al entrar</span>}>
        <div className="flex flex-col gap-8">
          <Segmented
            label="Qué muestra"
            value={draft.hero.source}
            options={[
              { value: "featured", label: "La pieza destacada" },
              { value: "media", label: "Foto o video propio" },
            ]}
            onChange={(v) => hero("source", v)}
          />
          {draft.hero.source === "featured" ? (
            <p className="m-0 border-l-2 border-accent bg-surface px-5 py-4 text-small text-ink-2">
              {featured ? (
                <>
                  Hoy se muestra <strong className="font-medium text-ink">{featured.name}</strong>, con su foto o video de ambiente. Para cambiarla, marca otra pieza como destacada en el{" "}
                  <a href={featured.editHref} className="text-ink underline decoration-accent underline-offset-4">
                    catálogo
                  </a>
                  .
                </>
              ) : (
                <>Ninguna pieza está marcada como destacada: se muestra la primera disponible del catálogo.</>
              )}
            </p>
          ) : (
            <>
              <div>
                <span className="mb-3 block text-label uppercase text-ink-2">Foto o video</span>
                <MediaPicker items={media} value={draft.hero.mediaId} onChange={(id) => hero("mediaId", id)} allowVideo testId="hero-media" />
                {err("hero.mediaId") && <p className="m-0 mt-2 text-label-sm uppercase text-accent">{err("hero.mediaId")}</p>}
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <TextInput label="Antetítulo" value={draft.hero.kicker ?? ""} onChange={(e) => hero("kicker", e.target.value)} placeholder="Neon Night · Nueva colección" maxLength={60} error={err("hero.kicker")} />
                <TextInput label="Título" value={draft.hero.title ?? ""} onChange={(e) => hero("title", e.target.value)} placeholder="Relojería de autor" maxLength={60} error={err("hero.title")} data-testid="hero-title" />
                <TextArea className="md:col-span-2" rows={3} label="Texto" value={draft.hero.text ?? ""} onChange={(e) => hero("text", e.target.value)} placeholder="Una frase corta bajo el título (opcional)." maxLength={220} error={err("hero.text")} />
                <TextInput label="Texto del botón" value={draft.hero.ctaLabel ?? ""} onChange={(e) => hero("ctaLabel", e.target.value)} placeholder={defaults.heroCta} maxLength={40} error={err("hero.ctaLabel")} />
                <TextInput
                  label="Enlace del botón"
                  value={draft.hero.ctaHref ?? ""}
                  onChange={(e) => hero("ctaHref", e.target.value)}
                  placeholder="/coleccion/relojeria"
                  list="home-links"
                  error={err("hero.ctaHref")}
                  hint="Sin enlace no aparece el botón; el de «Explorar la colección» siempre está."
                />
                <datalist id="home-links">
                  {links.map((l) => (
                    <option key={l.href} value={l.href}>
                      {l.label}
                    </option>
                  ))}
                </datalist>
              </div>
            </>
          )}
        </div>
      </FormSection>

      <FormSection n="03" title="Banda" aside={<span className="text-legal text-ink-3">Foto a pantalla completa con una frase</span>}>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-8">
            <div>
              <span className="mb-3 block text-label uppercase text-ink-2">Foto</span>
              <MediaPicker items={media} value={draft.band.mediaId} onChange={(id) => band("mediaId", id)} allowVideo={false} noneLabel="Foto por defecto" testId="band-media" />
              {err("band.mediaId") && <p className="m-0 mt-2 text-label-sm uppercase text-accent">{err("band.mediaId")}</p>}
            </div>
            <TextInput label="Frase" value={draft.band.title ?? ""} onChange={(e) => band("title", e.target.value)} placeholder={defaults.bandTitle} maxLength={90} error={err("band.title")} hint="Vacía: se usa la frase por defecto." />
            <Segmented label="Encuadre" value={draft.band.position} options={(Object.keys(BAND_POSITIONS) as BandPosition[]).map((p) => ({ value: p, label: POSITION_LABEL[p] }))} onChange={(v) => band("position", v)} />
          </div>
          <div>
            <span className="mb-3 block text-label uppercase text-ink-2">Vista previa</span>
            <div className="relative aspect-[16/9] overflow-hidden bg-surface">
              <Image src={bandMedia?.src ?? defaults.bandImage} alt="" fill sizes="380px" className="object-cover" style={{ objectPosition: BAND_POSITIONS[draft.band.position] }} />
              <span className="absolute inset-0 bg-black/40" aria-hidden="true" />
              <span className="absolute inset-0 flex items-center px-5 text-[15px] font-medium uppercase leading-tight">{draft.band.title || defaults.bandTitle}</span>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection n="04" title="Garantía y autenticidad" aside={<span className="text-legal text-ink-3">Los tres compromisos de la home</span>}>
        <TrustEditor value={blocks.trust} onChange={block("trust")} err={err} defaultKicker={defaults.trustKicker} />
      </FormSection>

      <FormSection n="05" title="Testimonios" aside={<span className="text-legal text-ink-3">Solo con autorización del cliente</span>}>
        <TestimonialsEditor value={blocks.testimonials} onChange={block("testimonials")} err={err} defaults={defaults.testimonials} />
      </FormSection>

      <FormSection n="06" title="Redes" aside={<span className="text-legal text-ink-3">Home, menú y pie de página</span>}>
        <SocialEditor value={blocks.social} onChange={block("social")} err={err} defaults={defaults.social} />
      </FormSection>

      <FormSection n="07" title="Orden de la página" aside={<span className="text-legal text-ink-3">El hero va siempre primero</span>}>
        <ol className="m-0 flex list-none flex-col gap-px border border-divider bg-divider p-0" data-testid="home-layout">
          {layout.map((b, i) => (
            <li key={b.id} className="flex items-center justify-between gap-4 bg-bg px-5 py-3.5" data-testid={`block-${b.id}`}>
              <span className={cn("flex items-baseline gap-4 text-label-lg uppercase", b.visible ? "text-ink" : "text-ink-3 line-through")}>
                <span className="text-label-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                {HOME_BLOCKS[b.id]}
              </span>
              <span className="flex items-center gap-5">
                <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0} aria-label={`Subir ${HOME_BLOCKS[b.id]}`} className="cursor-pointer text-label-sm text-ink-2 hover:text-ink disabled:opacity-30">
                  ↑
                </button>
                <button type="button" onClick={() => moveBlock(i, 1)} disabled={i === layout.length - 1} aria-label={`Bajar ${HOME_BLOCKS[b.id]}`} className="cursor-pointer text-label-sm text-ink-2 hover:text-ink disabled:opacity-30">
                  ↓
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={b.visible}
                  aria-label={`Mostrar ${HOME_BLOCKS[b.id]}`}
                  onClick={() => toggleBlock(i)}
                  className={cn("relative h-6 w-11 cursor-pointer border transition-colors", b.visible ? "border-accent bg-accent" : "border-border-strong hover:border-ink")}
                >
                  <span aria-hidden="true" className={cn("absolute top-[3px] h-4 w-4 transition-all", b.visible ? "left-[23px] bg-ink" : "left-[3px] bg-ink-2")} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      </FormSection>

      <FormSection n="08" title="Versiones" aside={<span className="text-legal text-ink-3">Las últimas {initial.history.length || 10} publicaciones</span>}>
        <div className="flex flex-col gap-4" data-testid="home-versions">
          <p className="m-0 text-small text-ink-2">
            {initial.publishedAt ? <>Publicado por última vez el {formatDate(initial.publishedAt)}.</> : <>La home usa los textos de fábrica: todavía no se ha publicado nada desde el panel.</>}
            {hasDraft && (
              <>
                {" "}Hay un borrador sin publicar.{" "}
                <button type="button" onClick={onDiscard} className="cursor-pointer text-ink underline decoration-accent underline-offset-4 hover:text-accent" data-testid="discard-draft">
                  Descartar borrador
                </button>
              </>
            )}
          </p>
          {initial.history.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-px border border-divider bg-divider p-0">
              {initial.history.map((v) => (
                <li key={v.at} className="flex items-center justify-between gap-4 bg-bg px-5 py-3.5">
                  <span className="text-small text-ink-2">{formatDate(v.at)}</span>
                  <button type="button" onClick={() => loadVersion(v)} className="cursor-pointer text-label-sm uppercase text-ink-2 hover:text-ink">
                    Cargar en el editor
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-legal text-ink-3">Cada vez que publiques, la versión anterior queda aquí para volver a ella.</p>
          )}
        </div>
      </FormSection>

      <div className="backdrop-glass fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-glass-deep lg:left-[248px]">
        <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-10 lg:px-14">
          <p className={cn("m-0 flex min-w-0 items-center gap-2.5 text-label-sm uppercase", tone)} role="status" aria-live="polite">
            <span className={cn("h-1.5 w-1.5 shrink-0", status.kind === "error" || dirty ? "bg-accent" : status.kind === "saved" ? "bg-ink" : "bg-ink-3")} aria-hidden="true" />
            <span className="truncate">{text}</span>
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onPreview} disabled={pending} data-testid="preview-home">
              Vista previa ↗
            </Button>
            <Button type="submit" size="sm" disabled={pending || (!dirty && !hasDraft)} data-testid="save-home">
              {pending ? "Guardando…" : "Publicar"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
