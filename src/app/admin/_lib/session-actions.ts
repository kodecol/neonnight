"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, adminSecret, createSessionToken } from "@/infrastructure/auth/session";
import { checkAdminPassword } from "@/infrastructure/auth/password";
import type { LoginState } from "@/presentation/components/admin/LoginForm";

export async function loginAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const secret = adminSecret();
  if (!secret) return { error: "El panel no está configurado." };
  const password = String(fd.get("password") ?? "");
  if (!checkAdminPassword(password)) {
    await new Promise((r) => setTimeout(r, 800)); // freno básico a la fuerza bruta
    return { error: "Contraseña incorrecta." };
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect("/admin/catalogo");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: SESSION_COOKIE, path: "/admin" });
  redirect("/admin/login");
}
