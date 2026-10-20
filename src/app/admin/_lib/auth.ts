import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, adminSecret, verifySessionToken } from "@/infrastructure/auth/session";

export async function isAdmin(): Promise<boolean> {
  const secret = adminSecret();
  if (!secret) return false;
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value, secret);
}

/** Defensa en profundidad: cada server action del panel verifica la sesión además del middleware. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
