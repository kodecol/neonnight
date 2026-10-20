import { ZodError } from "zod";
import { DomainError } from "@/domain/errors";
import { FieldValidationError } from "@/application/lib/errors";
import type { ActionResult } from "@/application/dto/admin.dto";

/** Traduce errores de validación y de dominio a un `ActionResult` para el formulario. */
export function toActionError(e: unknown, context: string): ActionResult<never> {
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of e.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Revisa los campos marcados.", fieldErrors };
  }
  if (e instanceof FieldValidationError) return { ok: false, error: e.message, fieldErrors: { [e.field]: e.message } };
  if (e instanceof DomainError) return { ok: false, error: e.message };
  console.error(`[admin:${context}]`, e);
  return { ok: false, error: "Error inesperado. Intenta de nuevo." };
}
