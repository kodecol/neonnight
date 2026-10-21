import { ImageResponse } from "next/og";
import { getContainer } from "@/infrastructure/container";
import { ogColors, ogFonts, ogIsotype, ogIsotypeHeight, ogPhoto } from "../../_og/brand";
import { loadProduct } from "./render-product";

export const OG_SIZE = { width: 1200, height: 630 };

/** Tarjeta OG de un producto: marca, nombre, precio y la foto recortada de la pieza. */
export async function productOgImage(slug: string): Promise<ImageResponse | null> {
  const [p, fonts, site, C] = await Promise.all([loadProduct(slug), ogFonts(), getContainer().content.get(), ogColors()]);
  const iso = await ogIsotype(site.brand.isotype);
  if (!p) return null;
  const name = p?.model ?? site.brand.name;
  const brand = p?.brand ?? "";
  const subtitle = p?.subtitle ?? "Relojes, joyas y perfumes verificados";
  const price = p ? `${p.priceFrom ? "Desde " : ""}${p.price.formatted}` : "";
  const photo = ogPhoto(p?.front?.src, 560, "png");

  return new ImageResponse(
    (
      <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", background: C.bg, color: C.ink, fontFamily: "Archivo" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 6, background: C.accent }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: photo ? 660 : 1200, padding: "64px 0 64px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iso} width={44} height={ogIsotypeHeight(44, site.brand.isotype)} alt="" />
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.32em" }}>{site.brand.wordmark}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {brand && <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent }}>{brand}</div>}
            <div style={{ fontSize: name.length > 22 ? 58 : 74, fontWeight: 500, lineHeight: 1.02, letterSpacing: -2, textTransform: "uppercase", marginTop: 14 }}>{name}</div>
            <div style={{ fontSize: 24, fontWeight: 200, color: C.ink2, marginTop: 18 }}>{subtitle}</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
            {price && <div style={{ fontSize: 40, fontWeight: 200 }}>{price}</div>}
          </div>
        </div>
        {photo && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 540, height: "100%", background: C.surface }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} width={460} height={460} alt="" style={{ objectFit: "contain" }} />
          </div>
        )}
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
