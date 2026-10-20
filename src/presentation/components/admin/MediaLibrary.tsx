"use client";
import { useRef, useState } from "react";
import type { AdminImageInput, MediaRoleKey } from "@/application/dto/admin.dto";
import { SmartImage as Image } from "@/presentation/components/primitives/SmartImage";
import { cn } from "@/presentation/lib/cn";
import { addImages, moveImage, removeImage, rolesOf, setAlt, toggleGallery, toggleRole, assignRole, type MediaDraft } from "@/presentation/lib/media-draft";
import { ACCEPT, BusyOverlay, PlusIcon, measure, slotAction, type UploadAction } from "./ImageField";

const HERO_VIDEO = "video";

export interface RoleCopy {
  label: string;
  /** Dónde aparece en la tienda. */
  hint: string;
  /** Etiqueta corta sobre la miniatura. */
  badge: string;
}

/**
 * Biblioteca única de fotos de la pieza. Se sube una vez y cada foto se
 * asigna a uno o varios usos (portada, segunda vista, fondo del hero, imagen
 * final) y, si se quiere, a la galería. Los usos se ven arriba como casillas
 * y también sobre cada miniatura.
 */
export function MediaLibrary({
  value,
  onChange,
  upload,
  roles,
  heroVideoPoster,
  error,
}: {
  value: MediaDraft;
  onChange: (next: MediaDraft) => void;
  upload: UploadAction;
  roles: Record<MediaRoleKey, RoleCopy>;
  heroVideoPoster: string | null;
  error?: string;
}) {
  const [selected, setSelected] = useState<string | null>(value.library[0]?.src ?? null);
  const [picking, setPicking] = useState<MediaRoleKey | null>(null);
  const [busy, setBusy] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  // Las subidas terminan en desorden: cada una se aplica sobre el último estado.
  const latest = useRef(value);
  latest.current = value;

  const current = value.library.find((i) => i.src === selected) ?? null;
  const roleKeys = Object.keys(roles) as MediaRoleKey[];

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    const list = [...files];
    setBusy((n) => n + list.length);
    await Promise.all(
      list.map(async (file) => {
        try {
          const { width, height } = await measure(file);
          const fd = new FormData();
          fd.set("file", file);
          fd.set("width", String(width));
          fd.set("height", String(height));
          const res = await upload(fd);
          if (res.ok) {
            const img: AdminImageInput = { src: res.data.src, width: res.data.width, height: res.data.height };
            const next = addImages(latest.current, [img]);
            latest.current = next;
            onChange(next);
            setSelected((s) => s ?? img.src);
          } else setUploadError(res.error);
        } catch {
          setUploadError("No se pudo leer una de las fotos.");
        } finally {
          setBusy((n) => n - 1);
        }
      }),
    );
    if (input.current) input.current.value = "";
  }

  function onTile(src: string) {
    if (picking) {
      onChange(assignRole(value, picking, src));
      setPicking(null);
    }
    setSelected(src);
  }

  return (
    <div className="flex flex-col gap-10" data-testid="media-library">
      <input ref={input} type="file" accept={ACCEPT} multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void handleFiles(e.target.files)} />

      {/* Usos: qué foto ocupa cada lugar de la ficha. */}
      <div>
        <span className="mb-4 block text-label uppercase text-ink-2">Dónde aparece cada foto</span>
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 lg:grid-cols-4" data-testid="media-roles">
          {roleKeys.map((role) => {
            const src = value.roles[role];
            const video = role === "hero" && src === HERO_VIDEO;
            const img = video ? null : value.library.find((i) => i.src === src);
            const active = picking === role;
            return (
              <li key={role} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setPicking(active ? null : role)}
                  aria-pressed={active}
                  data-testid={`media-role-${role}`}
                  className={cn(
                    "group relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden border bg-surface transition-colors",
                    active ? "border-accent" : img || video ? "border-divider hover:border-ink" : "border-dashed border-border hover:border-ink",
                  )}
                >
                  {img ? (
                    <Image src={img.src} alt="" fill sizes="(min-width: 1024px) 12vw, 40vw" className="object-contain p-2" />
                  ) : video && heroVideoPoster ? (
                    <>
                      <Image src={heroVideoPoster} alt="" fill sizes="(min-width: 1024px) 12vw, 40vw" className="object-cover" />
                      <span className="absolute bottom-2 left-2 bg-glass px-1.5 py-0.5 text-label-sm uppercase">Video</span>
                    </>
                  ) : (
                    <span className="text-label-sm uppercase text-ink-3">Sin asignar</span>
                  )}
                  {active && <span className="absolute inset-x-0 bottom-0 bg-accent px-2 py-1 text-center text-label-sm uppercase text-ink">Elige una foto abajo</span>}
                </button>
                <span className="mt-2.5 text-label uppercase text-ink">{roles[role].label}</span>
                <span className="mt-1 text-legal text-ink-3">{roles[role].hint}</span>
                {src && (
                  <button type="button" onClick={() => onChange(assignRole(value, role, null))} className={cn(slotAction, "mt-2 w-fit hover:text-accent")}>
                    Quitar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {picking && (
          <p className="m-0 mt-4 text-small text-ink-2" role="status">
            Toca la foto que quieres usar como <strong className="font-medium text-ink">{roles[picking].label.toLowerCase()}</strong>.{" "}
            <button type="button" onClick={() => setPicking(null)} className={cn(slotAction, "ml-3")}>
              Cancelar
            </button>
          </p>
        )}
      </div>

      {/* Biblioteca */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <span className="text-label uppercase text-ink-2">
            Fotos de la pieza · {value.library.length} <span className="text-ink-3">· {value.gallery.length} en la galería</span>
          </span>
          <button type="button" onClick={() => input.current?.click()} className={cn(slotAction, "text-ink")} data-testid="media-upload">
            + Subir fotos
          </button>
        </div>
        <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0 md:grid-cols-4 xl:grid-cols-6" data-testid="media-grid">
          {value.library.map((img, i) => {
            const used = rolesOf(value, img.src);
            const inGallery = value.gallery.includes(img.src);
            return (
              <li key={img.src}>
                <button
                  type="button"
                  onClick={() => onTile(img.src)}
                  aria-pressed={selected === img.src}
                  aria-label={`Foto ${i + 1}${used.length ? `: ${used.map((r) => roles[r].label).join(", ")}` : ""}`}
                  className={cn(
                    "relative block aspect-square w-full cursor-pointer overflow-hidden border bg-surface transition-colors",
                    selected === img.src ? "border-ink" : "border-divider hover:border-border-strong",
                    picking && "hover:border-accent",
                  )}
                >
                  <Image src={img.src} alt="" fill sizes="(min-width: 1280px) 9vw, (min-width: 768px) 20vw, 30vw" className="object-contain p-2" />
                  <span className="absolute left-1.5 top-1.5 text-label-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <span className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap gap-1">
                    {used.map((r) => (
                      <span key={r} className="bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-ink">
                        {roles[r].badge}
                      </span>
                    ))}
                    {inGallery && <span className="border border-border-strong bg-glass px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-ink-2">Galería</span>}
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy > 0}
              className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-surface transition-colors hover:border-ink"
            >
              {busy > 0 ? <BusyOverlay /> : <PlusIcon />}
              {busy === 0 && <span className="text-label-sm uppercase text-ink-2">Añadir</span>}
            </button>
          </li>
        </ul>
        <p className="m-0 mt-3 text-legal text-ink-3">JPG · PNG · WebP · AVIF, hasta 8 MB cada una. Puedes subir varias a la vez. Recortes sobre fondo transparente para portada y segunda vista; fotos de ambiente horizontales para el hero y la imagen final.</p>
        {(uploadError || error) && (
          <p role="alert" className="m-0 mt-3 text-label-sm uppercase text-accent">
            {uploadError ?? error}
          </p>
        )}
      </div>

      {/* Inspector de la foto elegida */}
      {current && (
        <div className="grid gap-6 border border-divider p-5 md:grid-cols-[220px_minmax(0,1fr)] md:p-6" data-testid="media-inspector">
          <div className="relative aspect-square overflow-hidden bg-surface">
            <Image src={current.src} alt={current.alt ?? ""} fill sizes="220px" className="object-contain p-3" />
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <div>
              <span className="mb-3 block text-label uppercase text-ink-2">Usar esta foto como</span>
              <div className="flex flex-wrap gap-2">
                {roleKeys.map((role) => {
                  const on = value.roles[role] === current.src;
                  return (
                    <button
                      key={role}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onChange(toggleRole(value, role, current.src))}
                      data-testid={`assign-${role}`}
                      className={cn(
                        "cursor-pointer border px-3.5 py-2.5 text-label-sm uppercase transition-colors",
                        on ? "border-accent bg-accent text-ink" : "border-border text-ink-2 hover:border-ink hover:text-ink",
                      )}
                    >
                      {roles[role].label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={value.gallery.includes(current.src)}
                  onClick={() => onChange(toggleGallery(value, current.src))}
                  data-testid="assign-gallery"
                  className={cn(
                    "cursor-pointer border px-3.5 py-2.5 text-label-sm uppercase transition-colors",
                    value.gallery.includes(current.src) ? "border-ink bg-ink text-bg" : "border-border text-ink-2 hover:border-ink hover:text-ink",
                  )}
                >
                  Galería
                </button>
              </div>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-label uppercase text-ink-2">Texto alternativo</span>
              <input
                value={current.alt ?? ""}
                onChange={(e) => onChange(setAlt(value, current.src, e.target.value))}
                maxLength={160}
                placeholder="Describe la foto: lo que ve quien no puede verla"
                className="border border-border bg-transparent px-4 py-3 text-small text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink"
              />
            </label>
            <div className="mt-auto flex flex-wrap items-center gap-5">
              <button type="button" onClick={() => onChange(moveImage(value, current.src, -1))} disabled={value.library[0]?.src === current.src} className={slotAction}>
                ← Antes
              </button>
              <button type="button" onClick={() => onChange(moveImage(value, current.src, 1))} disabled={value.library.at(-1)?.src === current.src} className={slotAction}>
                Después →
              </button>
              <button
                type="button"
                onClick={() => {
                  const idx = value.library.findIndex((i) => i.src === current.src);
                  const next = removeImage(value, current.src);
                  onChange(next);
                  setSelected(next.library[Math.min(idx, next.library.length - 1)]?.src ?? null);
                }}
                className={cn(slotAction, "ml-auto hover:text-accent")}
                data-testid="media-remove"
              >
                Quitar de la pieza
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
