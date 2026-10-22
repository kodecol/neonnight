"use server";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { AccountView, ChangePasswordInput } from "@/application/dto/account.dto";
import { requireAdmin } from "../../../_lib/auth";
import { adminAccount, setSessionCookie } from "../../../_lib/account";
import { toActionError } from "../../../_lib/result";
import { container } from "@/app/_lib/tenant";

/** Tras subir la versión, esta sesión sigue abierta con una cookie nueva; las demás caen. */
async function reissue(version: number): Promise<AccountView> {
  const secret = (await container()).config.adminSecret;
  if (secret) await setSessionCookie(secret, version);
  return (await adminAccount()).view();
}

export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult<AccountView>> {
  await requireAdmin();
  try {
    return { ok: true, data: await reissue(await (await adminAccount()).changePassword(input)), message: "Contraseña actualizada. Las demás sesiones se cerraron." };
  } catch (e) {
    return toActionError(e, "account-password");
  }
}

export async function revokeSessionsAction(): Promise<ActionResult<AccountView>> {
  await requireAdmin();
  try {
    return { ok: true, data: await reissue(await (await adminAccount()).revokeAllSessions()), message: "Se cerraron las demás sesiones." };
  } catch (e) {
    return toActionError(e, "account-revoke");
  }
}
