import type { Metadata } from "next";
import { AccountSecurity } from "@/presentation/components/admin/AccountSecurity";
import { adminAccount } from "../../../_lib/account";
import { changePasswordAction, revokeSessionsAction } from "./actions";

export const metadata: Metadata = { title: "Seguridad · Ajustes" };

export default async function SecurityPage() {
  const view = await adminAccount().view();
  return (
    <AccountSecurity initial={view} changePassword={changePasswordAction} revokeSessions={revokeSessionsAction} />
  );
}
