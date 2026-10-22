import type { Metadata } from "next";
import { AccountSecurity } from "@/presentation/components/admin/AccountSecurity";
import { adminAccount } from "../../../_lib/account";
import { changePasswordAction, revokeSessionsAction } from "./actions";
import { requireAdmin } from "../../../_lib/auth";

export const metadata: Metadata = { title: "Seguridad · Ajustes" };

export default async function SecurityPage() {
  await requireAdmin(); // el layout no basta: una petición RSC puede renderizar solo esta página
  const view = await (await adminAccount()).view();
  return (
    <AccountSecurity initial={view} changePassword={changePasswordAction} revokeSessions={revokeSessionsAction} />
  );
}
