import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readSessionToken } from "@/infrastructure/auth/session";
import { adminAccount } from "./account";
import { container } from "@/app/_lib/tenant";

/** Firma y vencimiento válidos, y la versión de la cookie es la vigente en la base. */
export async function isAdmin(): Promise<boolean> {
  const secret = (await container()).config.adminSecret;
  if (!secret) return false;
  const jar = await cookies();
  const session = await readSessionToken(jar.get(SESSION_COOKIE)?.value, secret);
  if (!session) return false;
  return session.version === (await (await adminAccount()).sessionVersion());
}

/** Defensa en profundidad: cada server action del panel verifica la sesión además del middleware. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
