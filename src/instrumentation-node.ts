/**
 * Parte de Node del arranque: aplica el brand pack de STORE_BRAND_PACK si la
 * base aún no tiene marca. Un pack que no se puede leer o aplicar NUNCA tumba
 * el arranque: queda en el log y en `/api/health` (`brand_pack: "error"`), y
 * la tienda sigue sirviendo.
 */
import { applyBrandPackOnBoot } from "./infrastructure/brand/brand-pack-on-boot";

const g = globalThis as unknown as { __nnBrandPack?: string };
const pack = process.env.STORE_BRAND_PACK;

if (pack) {
  try {
    const result = await applyBrandPackOnBoot();
    g.__nnBrandPack = result.status;
    console.log(`[brand-pack] ${pack}: ${result.status}${result.applied ? ` (${result.applied.join(", ")})` : ""}`);
  } catch (e) {
    g.__nnBrandPack = "error";
    console.error(`[brand-pack] ${pack}: ERROR, la tienda sigue sin aplicar el pack:`, e);
  }
}
