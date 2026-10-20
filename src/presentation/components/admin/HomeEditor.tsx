"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/application/dto/admin.dto";
import { BAND_POSITIONS, type BandPosition, type HomeSettingsInput, type SiteMediaDto } from "@/application/dto/home.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { SmartImage as Image } from "@/presentation/components/primitives/SmartImage";
import { cn } from "@/presentation/lib/cn";
import { FormSection, Segmented, TextArea, TextInput } from "./fields";
import { SiteMediaLibrary, type SiteMediaActions } from "./SiteMediaLibrary";

type Status = { kind: "idle" } | { kind: "saved" } | { kind: "error"; message: string };

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
 * editable de la home (hero y banda). Lo que se deja vacío usa el texto por
 * defecto; guardar publica al instante.
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
  initial: HomeSettingsInput & { updatedAt: string | null };
  media: SiteMediaDto[];
  featured: { name: string; href: string; editHref: string } | null;
  defaults: { bandTitle: string; bandImage: string; heroCta: string };
  links: Array<{ href: string; label: string }>;
  videosEnabled: boolean;
  actions: SiteMediaActions & { save: (input: HomeSettingsInput) => Promise<ActionResult> };
}) {
  const router = useRouter();
  const [media, setMedia] = useState(initialMedia);
  const [draft, setDraft] = useState<HomeSettingsInput>({ hero: initial.hero, band: initial.band });
  const [saved, setSaved] = useState(() => JSON.stringify({ hero: initial.hero, band: initial.band }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== saved;

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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await actions.save(draft);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setStatus({ kind: "error", message: res.error });
        return;
      }
      setErrors({});
      setSaved(JSON.stringify(draft));
      setStatus({ kind: "saved" });
      // Los usos de la biblioteca cambian con lo guardado.
      setMedia((items) =>
        items.map((m) => ({
          ...m,
          usedIn: [...(draft.hero.source === "media" && draft.hero.mediaId === m.id ? ["Hero"] : []), ...(draft.band.mediaId === m.id ? ["Banda"] : [])],
        })),
      );
      router.refresh();
    });
  }

  const [text, tone] = pending
    ? ["Guardando…", "text-ink-2"]
    : status.kind === "error"
      ? [status.message, "text-accent"]
      : dirty
        ? ["Cambios sin guardar", "text-ink-2"]
        : status.kind === "saved"
          ? ["Guardado · publicado en la home", "text-ink"]
          : ["Sin cambios", "text-ink-3"];

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

      <div className="backdrop-glass fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-glass-deep lg:left-[248px]">
        <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-10 lg:px-14">
          <p className={cn("m-0 flex min-w-0 items-center gap-2.5 text-label-sm uppercase", tone)} role="status" aria-live="polite">
            <span className={cn("h-1.5 w-1.5 shrink-0", status.kind === "error" || dirty ? "bg-accent" : status.kind === "saved" ? "bg-ink" : "bg-ink-3")} aria-hidden="true" />
            <span className="truncate">{text}</span>
          </p>
          <Button type="submit" size="sm" disabled={pending || !dirty} data-testid="save-home">
            {pending ? "Guardando…" : "Guardar y publicar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
