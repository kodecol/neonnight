/**
 * Arranque del servidor (Next lo espera antes de atender peticiones).
 * Solo en Node: aplica el brand pack de STORE_BRAND_PACK si la base aún no
 * tiene marca (ver infrastructure/brand/brand-pack-on-boot.ts). Un pack que
 * no se puede leer o aplicar NUNCA tumba el arranque: queda en el log y en
 * `/api/health` (`brand_pack: "error"`), y la tienda sigue sirviendo.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.STORE_BRAND_PACK) return;
  const g = globalThis as unknown as { __nnBrandPack?: string };
  try {
    const { applyBrandPackOnBoot } = await import("./infrastructure/brand/brand-pack-on-boot");
    const result = await applyBrandPackOnBoot();
    g.__nnBrandPack = result.status;
    console.log(`[brand-pack] ${process.env.STORE_BRAND_PACK}: ${result.status}${result.applied ? ` (${result.applied.join(", ")})` : ""}`);
  } catch (e) {
    g.__nnBrandPack = "error";
    console.error(`[brand-pack] ${process.env.STORE_BRAND_PACK}: ERROR, la tienda sigue sin aplicar el pack:`, e);
  }
}
