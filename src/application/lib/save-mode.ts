import { z } from "zod";
import { FieldValidationError } from "./errors";

/**
 * Cómo se guarda un editor con vista previa: `draft` (borrador, la tienda no
 * cambia) o `publish`. Llega de una server action, es decir, del cliente:
 * cualquier otro valor se rechaza en vez de publicar por descarte.
 */
export const SaveModeSchema = z.enum(["draft", "publish"]);
export type SaveMode = z.infer<typeof SaveModeSchema>;

export function parseSaveMode(raw: unknown): SaveMode {
  const r = SaveModeSchema.safeParse(raw);
  if (!r.success) throw new FieldValidationError("mode", "Modo de guardado no válido: usa borrador o publicar.");
  return r.data;
}
