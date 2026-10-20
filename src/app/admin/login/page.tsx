import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { isAdminConfigured } from "@/infrastructure/auth/password";
import { LoginForm } from "@/presentation/components/admin/LoginForm";
import { loginAction } from "../_lib/session-actions";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { brand } = await getContainer().content.get();
  return <LoginForm wordmark={brand.wordmark} login={loginAction} configured={isAdminConfigured()} />;
}
