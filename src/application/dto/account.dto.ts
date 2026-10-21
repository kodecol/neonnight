import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 12;

export const ChangePasswordInputSchema = z.object({
  current: z.string().min(1, "Escribe la contraseña actual."),
  next: z.string().min(MIN_PASSWORD_LENGTH, `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`).max(200, "Máximo 200 caracteres."),
  confirm: z.string(),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;

export interface AccountView {
  /** La contraseña ya se cambió desde el panel (vive en la base, con hash). */
  stored: boolean;
  passwordChangedAt: string | null;
  sessionVersion: number;
}
