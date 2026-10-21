import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { isAdminConfigured } from "@/infrastructure/auth/password";
import { LoginForm } from "@/presentation/components/admin/LoginForm";
import { loginAction } from "../_lib/session-actions";
import { adminAccount } from "../_lib/account";
import { isAdmin } from "../_lib/auth";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin/catalogo");
  const [{ brand }, account] = await Promise.all([getContainer().content.get(), adminAccount().view()]);
  return <LoginForm wordmark={brand.wordmark} login={loginAction} configured={isAdminConfigured(account.stored)} />;
}
