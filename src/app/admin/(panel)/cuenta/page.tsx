import type { Metadata } from "next";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { AccountSecurity } from "@/presentation/components/admin/AccountSecurity";
import { adminAccount } from "../../_lib/account";
import { changePasswordAction, revokeSessionsAction } from "./actions";

export const metadata: Metadata = { title: "Cuenta" };

export default async function AccountPage() {
  const view = await adminAccount().view();
  return (
    <>
      <AdminPageHeader kicker="Seguridad" title="Cuenta" />
      <AccountSecurity initial={view} changePassword={changePasswordAction} revokeSessions={revokeSessionsAction} />
    </>
  );
}
