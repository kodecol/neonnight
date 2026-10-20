"use client";
import { useRef, useState } from "react";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { SiteMediaDto } from "@/application/dto/home.dto";
import type { DirectUploadTicket } from "@/application/ports/site-media";
import { SmartImage as Image } from "@/presentation/components/primitives/SmartImage";
import { cn } from "@/presentation/lib/cn";
import { ACCEPT, BusyOverlay, PlusIcon, measure, slotAction } from "./ImageField";

const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export interface SiteMediaActions {
  uploadImage: (fd: FormData) => Promise<ActionResult<SiteMediaDto>>;
  requestVideo: () => Promise<ActionResult<DirectUploadTicket>>;
  registerVideo: (input: { src: string; width: number; height: number }) => Promise<ActionResult<SiteMediaDto>>;
  updateAlt: (input: { id: string; alt: string }) => Promise<ActionResult>;
  remove: (id: string) => Promise<ActionResult>;
}

/** Sube el video directo a Cloudinary con la firma del servidor (no pasa por la app). */
function uploadVideo(ticket: DirectUploadTicket, file: File, onProgress: (p: number) => void): Promise<{ secure_url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(ticket.fields)) fd.set(k, v);
    fd.set("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", ticket.url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error("Cloudinary rechazó el video.")));
    xhr.onerror = () => reject(new Error("Se cortó la subida del video."));
    xhr.send(fd);
  });
}

/**
 * Biblioteca de medios del sitio: fotos y videos que se suben una vez y se
 * usan en la home. Muestra dónde se usa cada uno y no deja borrar lo que está
 * en uso.
 */
export function SiteMediaLibrary({
  items,
  onItems,
  actions,
  videosEnabled,
}: {
  items: SiteMediaDto[];
  onItems: (next: SiteMediaDto[]) => void;
  actions: SiteMediaActions;
  videosEnabled: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(items[0]?.id ?? null);
  const [busy, setBusy] = useState<{ count: number; progress: number | null }>({ count: 0, progress: null });
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef(items);
  latest.current = items;
  const current = items.find((m) => m.id === selected) ?? null;

  const add = (m: SiteMediaDto) => {
    const next = [m, ...latest.current];
    latest.current = next;
    onItems(next);
    setSelected(m.id);
  };

  async function uploadOne(file: File) {
    if (file.type.startsWith("video/")) {
      if (!videosEnabled) throw new Error("Los videos necesitan Cloudinary configurado.");
      if (file.size > MAX_VIDEO_BYTES) throw new Error("El video supera 100 MB.");
      const ticket = await actions.requestVideo();
      if (!ticket.ok) throw new Error(ticket.error);
      const res = await uploadVideo(ticket.data, file, (p) => setBusy((b) => ({ ...b, progress: p })));
      const saved = await actions.registerVideo({ src: res.secure_url, width: res.width, height: res.height });
      if (!saved.ok) throw new Error(saved.error);
      add(saved.data);
      return;
    }
    const { width, height } = await measure(file);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("width", String(width));
    fd.set("height", String(height));
    const res = await actions.uploadImage(fd);
    if (!res.ok) throw new Error(res.error);
    add(res.data);
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = [...files];
    setBusy({ count: list.length, progress: null });
    for (const file of list) {
      try {
        await uploadOne(file);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
      } finally {
        setBusy((b) => ({ count: b.count - 1, progress: null }));
      }
    }
    if (input.current) input.current.value = "";
  }

  async function saveAlt(id: string, alt: string) {
    const res = await actions.updateAlt({ id, alt });
    if (!res.ok) setError(res.error);
  }

  async function remove(m: SiteMediaDto) {
    if (!window.confirm("¿Quitar este archivo de la biblioteca? También se borra de Cloudinary.")) return;
    const res = await actions.remove(m.id);
    if (!res.ok) return setError(res.error);
    const next = latest.current.filter((x) => x.id !== m.id);
    onItems(next);
    setSelected(next[0]?.id ?? null);
  }

  return (
    <div className="flex flex-col gap-6" data-testid="site-media">
      <input
        ref={input}
        type="file"
        multiple
        accept={videosEnabled ? `${ACCEPT},${VIDEO_ACCEPT}` : ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0 md:grid-cols-5 xl:grid-cols-7" data-testid="site-media-grid">
        <li>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy.count > 0}
            className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-surface transition-colors hover:border-ink"
            data-testid="site-media-upload"
          >
            {busy.count > 0 ? <BusyOverlay /> : <PlusIcon />}
            {busy.count === 0 && <span className="text-label-sm uppercase text-ink-2">Subir</span>}
            {busy.progress !== null && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" style={{ width: `${Math.round(busy.progress * 100)}%` }} />}
          </button>
        </li>
        {items.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setSelected(m.id)}
              aria-pressed={selected === m.id}
              aria-label={`${m.kind === "video" ? "Video" : "Foto"}${m.usedIn.length ? `, en uso: ${m.usedIn.join(", ")}` : ""}`}
              className={cn("relative block aspect-square w-full cursor-pointer overflow-hidden border bg-surface transition-colors", selected === m.id ? "border-ink" : "border-divider hover:border-border-strong")}
            >
              <Image src={m.kind === "video" ? (m.poster ?? m.src) : m.src} alt="" fill sizes="(min-width: 1280px) 8vw, (min-width: 768px) 16vw, 30vw" className="object-cover" />
              <span className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap gap-1">
                {m.kind === "video" && <span className="bg-glass px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-ink">Video</span>}
                {m.usedIn.map((u) => (
                  <span key={u} className="bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-ink">
                    {u}
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="m-0 text-legal text-ink-3">
        Fotos JPG, PNG, WebP o AVIF hasta 8 MB{videosEnabled ? "; videos MP4 o WebM hasta 100 MB (suben directo a Cloudinary)" : "; los videos se activan con Cloudinary"}. Horizontales y de buena resolución para el hero y la banda.
      </p>
      {error && (
        <p role="alert" className="m-0 text-label-sm uppercase text-accent">
          {error}
        </p>
      )}

      {current && (
        <div className="grid gap-6 border border-divider p-5 md:grid-cols-[260px_minmax(0,1fr)] md:p-6" data-testid="site-media-inspector">
          <div className="relative aspect-video overflow-hidden bg-surface">
            {current.kind === "video" ? (
              <video src={current.src} poster={current.poster ?? undefined} muted controls playsInline className="h-full w-full object-cover" />
            ) : (
              <Image src={current.src} alt={current.alt} fill sizes="260px" className="object-cover" />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <span className="text-legal text-ink-3">
              {current.kind === "video" ? "Video" : "Foto"} · {current.width} × {current.height}
              {current.usedIn.length > 0 && <> · En uso: {current.usedIn.join(", ")}</>}
            </span>
            <label className="flex flex-col gap-2">
              <span className="text-label uppercase text-ink-2">Texto alternativo</span>
              <input
                key={current.id}
                defaultValue={current.alt}
                maxLength={160}
                onBlur={(e) => {
                  const alt = e.target.value.trim();
                  if (alt === current.alt) return;
                  onItems(latest.current.map((x) => (x.id === current.id ? { ...x, alt } : x)));
                  void saveAlt(current.id, alt);
                }}
                placeholder="Describe la foto: lo que ve quien no puede verla"
                className="border border-border bg-transparent px-4 py-3 text-small text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink"
                data-testid="site-media-alt"
              />
              <span className="text-legal text-ink-3">Se guarda al salir del campo.</span>
            </label>
            <div className="mt-auto flex items-center justify-between gap-4">
              <span className="text-legal text-ink-3">{current.usedIn.length ? "Para quitarlo, primero cámbialo donde se usa." : "Libre: no se usa en la home."}</span>
              <button type="button" onClick={() => void remove(current)} disabled={current.usedIn.length > 0} className={cn(slotAction, "hover:text-accent")} data-testid="site-media-remove">
                Quitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
