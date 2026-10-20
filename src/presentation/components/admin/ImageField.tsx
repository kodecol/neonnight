"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ActionResult, AdminImageInput } from "@/application/dto/admin.dto";
import type { StoredMedia } from "@/application/ports/media-uploader";
import { cn } from "@/presentation/lib/cn";

export type UploadAction = (fd: FormData) => Promise<ActionResult<StoredMedia>>;

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/** Mide la foto en el navegador antes de subirla (el disco local no la decodifica). */
async function measure(file: File): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const size = { width: bmp.width, height: bmp.height };
  bmp.close();
  return size;
}

function useUploader(upload: UploadAction, onDone: (img: AdminImageInput) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { width, height } = await measure(file);
      const fd = new FormData();
      fd.set("file", file);
      fd.set("width", String(width));
      fd.set("height", String(height));
      const res = await upload(fd);
      if (res.ok) onDone({ src: res.data.src, width: res.data.width, height: res.data.height });
      else setError(res.error);
    } catch {
      setError("No se pudo leer la foto.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const picker = (
    <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void handle(e.target.files?.[0])} />
  );
  return { busy, error, pick: () => input.current?.click(), picker };
}

const slotAction = "cursor-pointer text-label-sm uppercase text-ink-2 transition-colors hover:text-ink disabled:opacity-45";

/** Una foto (frente o reverso): vista previa cuadrada, subir, reemplazar y quitar. */
export function ImageSlot({
  label,
  value,
  onChange,
  upload,
  error,
}: {
  label: string;
  value: AdminImageInput | null;
  onChange: (next: AdminImageInput | null) => void;
  upload: UploadAction;
  error?: string;
}) {
  const u = useUploader(upload, onChange);
  const message = u.error ?? error;
  return (
    <div className="flex flex-col">
      <span className="mb-2.5 text-label uppercase text-ink-2">{label}</span>
      {u.picker}
      {value ? (
        <div className="group relative aspect-square overflow-hidden border border-divider bg-surface">
          <Image src={value.src} alt={value.alt ?? label} fill sizes="(min-width: 1280px) 22vw, (min-width: 768px) 40vw, 90vw" className="object-contain p-4" />
          {u.busy && <BusyOverlay />}
        </div>
      ) : (
        <button
          type="button"
          onClick={u.pick}
          disabled={u.busy}
          className={cn(
            "relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 border border-dashed bg-surface transition-colors hover:border-ink",
            message ? "border-accent" : "border-border",
          )}
        >
          {u.busy ? (
            <BusyOverlay />
          ) : (
            <>
              <PlusIcon />
              <span className="text-label uppercase text-ink-2">Subir foto</span>
              <span className="text-legal text-ink-3">JPG · PNG · WebP · AVIF — máx. 8 MB</span>
            </>
          )}
        </button>
      )}
      {value && (
        <div className="mt-3 flex gap-5">
          <button type="button" onClick={u.pick} disabled={u.busy} className={slotAction}>
            Reemplazar
          </button>
          <button type="button" onClick={() => onChange(null)} disabled={u.busy} className={cn(slotAction, "hover:text-accent")}>
            Quitar
          </button>
        </div>
      )}
      {message && (
        <p role="alert" className="m-0 mt-2 text-label-sm uppercase text-accent">
          {message}
        </p>
      )}
    </div>
  );
}

/** Galería: lista ordenable de fotos. */
export function GalleryField({ value, onChange, upload }: { value: AdminImageInput[]; onChange: (next: AdminImageInput[]) => void; upload: UploadAction }) {
  const u = useUploader(upload, (img) => onChange([...value, img]));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };

  return (
    <div>
      {u.picker}
      <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 xl:grid-cols-4">
        {value.map((img, i) => (
          <li key={`${img.src}-${i}`} className="flex flex-col">
            <div className="relative aspect-square overflow-hidden border border-divider bg-surface">
              <Image src={img.src} alt={img.alt ?? `Foto ${i + 1}`} fill sizes="(min-width: 1280px) 14vw, (min-width: 768px) 28vw, 45vw" className="object-contain p-3" />
              <span className="absolute left-2.5 top-2 text-label-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <div className="flex gap-3">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Mover foto ${i + 1} a la izquierda`} className={slotAction}>
                  ←
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label={`Mover foto ${i + 1} a la derecha`} className={slotAction}>
                  →
                </button>
              </div>
              <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className={cn(slotAction, "hover:text-accent")}>
                Quitar
              </button>
            </div>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={u.pick}
            disabled={u.busy}
            className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-border bg-surface transition-colors hover:border-ink"
          >
            {u.busy ? (
              <BusyOverlay />
            ) : (
              <>
                <PlusIcon />
                <span className="text-label uppercase text-ink-2">Añadir</span>
              </>
            )}
          </button>
        </li>
      </ul>
      {u.error && (
        <p role="alert" className="m-0 mt-3 text-label-sm uppercase text-accent">
          {u.error}
        </p>
      )}
    </div>
  );
}

function BusyOverlay() {
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-glass" role="status">
      <span className="relative h-px w-24 overflow-hidden bg-divider">
        <span className="nn-busy-bar absolute inset-y-0 bg-accent" />
      </span>
      <span className="text-label-sm uppercase text-ink-2">Subiendo…</span>
    </span>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" className="text-ink-2">
      <path d="M11 3v16M3 11h16" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
