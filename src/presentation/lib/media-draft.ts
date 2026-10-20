import type { AdminImageInput, AdminMediaInput, MediaRoleKey } from "@/application/dto/admin.dto";

/**
 * Operaciones puras sobre la biblioteca de medios que edita el panel. Una foto
 * puede tener varios usos; cada uso, una sola foto. Asignar un uso a otra foto
 * se lo quita a la anterior.
 */
export type MediaDraft = AdminMediaInput;

export const emptyMedia = (): MediaDraft => ({ library: [], roles: { front: null, back: null, hero: null, band: null }, gallery: [] });

export function rolesOf(m: MediaDraft, src: string): MediaRoleKey[] {
  return (Object.keys(m.roles) as MediaRoleKey[]).filter((r) => m.roles[r] === src);
}

export function assignRole(m: MediaDraft, role: MediaRoleKey, src: string | null): MediaDraft {
  return { ...m, roles: { ...m.roles, [role]: src } };
}

/** Pone o quita un uso de una foto (si ya lo tiene, se lo quita). */
export function toggleRole(m: MediaDraft, role: MediaRoleKey, src: string): MediaDraft {
  return assignRole(m, role, m.roles[role] === src ? null : src);
}

export function toggleGallery(m: MediaDraft, src: string): MediaDraft {
  const on = m.gallery.includes(src);
  // La galería sigue el orden de la biblioteca.
  const gallery = on ? m.gallery.filter((s) => s !== src) : m.library.map((i) => i.src).filter((s) => s === src || m.gallery.includes(s));
  return { ...m, gallery };
}

/** Añade fotos nuevas (sin repetir): entran en la galería y llenan portada y segunda vista si están vacías. */
export function addImages(m: MediaDraft, imgs: AdminImageInput[]): MediaDraft {
  const fresh = imgs.filter((img) => !m.library.some((i) => i.src === img.src));
  if (fresh.length === 0) return m;
  const library = [...m.library, ...fresh];
  // Las primeras fotos de una pieza nueva ocupan portada y segunda vista (también si llegan de a una).
  const roles = { ...m.roles };
  for (const img of fresh) {
    if (!roles.front) roles.front = img.src;
    else if (!roles.back && roles.front !== img.src) roles.back = img.src;
  }
  return { library, roles, gallery: library.map((i) => i.src).filter((s) => m.gallery.includes(s) || fresh.some((f) => f.src === s)) };
}

/** Quita la foto de la biblioteca y de todos sus usos. */
export function removeImage(m: MediaDraft, src: string): MediaDraft {
  const roles = { ...m.roles };
  for (const r of Object.keys(roles) as MediaRoleKey[]) if (roles[r] === src) roles[r] = null;
  return { library: m.library.filter((i) => i.src !== src), roles, gallery: m.gallery.filter((s) => s !== src) };
}

export function moveImage(m: MediaDraft, src: string, delta: -1 | 1): MediaDraft {
  const i = m.library.findIndex((img) => img.src === src);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= m.library.length) return m;
  const library = [...m.library];
  [library[i], library[j]] = [library[j]!, library[i]!];
  const order = library.map((img) => img.src);
  return { ...m, library, gallery: order.filter((s) => m.gallery.includes(s)) };
}

export function setAlt(m: MediaDraft, src: string, alt: string): MediaDraft {
  return { ...m, library: m.library.map((img) => (img.src === src ? { ...img, alt } : img)) };
}
