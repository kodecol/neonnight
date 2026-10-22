import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminConfigured } from "@/infrastructure/auth/password";
import { LoginForm } from "@/presentation/components/admin/LoginForm";
import { loginAction } from "../_lib/session-actions";
import { adminAccount } from "../_lib/account";
import { isAdmin } from "../_lib/auth";
import { container } from "@/app/_lib/tenant";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin/catalogo");
  const [{ brand }, account] = await Promise.all([(await container()).content.get(), (await adminAccount()).view()]);
  return <LoginForm wordmark={brand.wordmark} isotype={brand.isotype} login={loginAction} configured={isAdminConfigured(account.stored)} />;
}
