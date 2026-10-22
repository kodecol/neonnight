import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/presentation/components/admin/LoginForm";
import { loginAction } from "../_lib/session-actions";
import { adminAccount } from "../_lib/account";
import { isAdmin } from "../_lib/auth";
import { container } from "@/app/_lib/tenant";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin/catalogo");
  const c = await container();
  const [{ brand }, account] = await Promise.all([c.content.get(), (await adminAccount()).view()]);
  // Configurado: hay clave de sesión y una contraseña (la de la base o, solo en single, la inicial del entorno).
  const configured = Boolean(c.config.adminSecret) && (account.stored || Boolean(c.config.adminPassword));
  return <LoginForm wordmark={brand.wordmark} isotype={brand.isotype} login={loginAction} configured={configured} />;
}
