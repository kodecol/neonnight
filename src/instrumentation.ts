/**
 * Arranque del servidor (Next lo espera antes de atender peticiones).
 * Solo en Node: aplica el brand pack de STORE_BRAND_PACK si la base aún no
 * tiene marca (ver infrastructure/brand/brand-pack-on-boot.ts).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.STORE_BRAND_PACK) return;
  const { applyBrandPackOnBoot } = await import("./infrastructure/brand/brand-pack-on-boot");
  const result = await applyBrandPackOnBoot();
  console.log(`[brand-pack] ${process.env.STORE_BRAND_PACK}: ${result.status}${result.applied ? ` (${result.applied.join(", ")})` : ""}`);
}
