"use server";
import { getContainer } from "@/infrastructure/container";
import { SavePaymentSettings } from "@/application/use-cases/admin/payment-settings";
import type { ActionResult, PaymentSettingsInput, PaymentSettingsViewDto } from "@/application/dto/admin.dto";
import { requireAdmin } from "../../../_lib/auth";
import { toActionError } from "../../../_lib/result";

export async function savePaymentSettingsAction(input: PaymentSettingsInput): Promise<ActionResult<PaymentSettingsViewDto>> {
  await requireAdmin();
  try {
    const { paymentSettings, clock } = getContainer();
    const data = await new SavePaymentSettings({ settings: paymentSettings, clock }).execute(input);
    return { ok: true, data };
  } catch (e) {
    return toActionError(e, "payment-settings");
  }
}
