"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, adminSecret } from "@/infrastructure/auth/session";
import type { LoginState } from "@/presentation/components/admin/LoginForm";
import { adminAccount, clientIp, setSessionCookie } from "./account";

export async function loginAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const secret = adminSecret();
  if (!secret) return { error: "El panel no está configurado." };
  const result = await adminAccount().login(String(fd.get("password") ?? ""), await clientIp());
  if (!result.ok) {
    if (result.reason === "throttled") {
      const minutes = Math.ceil(result.retryAfter / 60);
      return { error: `Demasiados intentos. Espera ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.` };
    }
    await new Promise((r) => setTimeout(r, 800)); // además del límite por IP
    return { error: "Contraseña incorrecta." };
  }
  await setSessionCookie(secret, result.version);
  redirect("/admin/catalogo");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: SESSION_COOKIE, path: "/admin" });
  redirect("/admin/login");
}
