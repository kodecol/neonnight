import { ImageResponse } from "next/og";
import { loadProduct } from "./render-product";

export const OG_SIZE = { width: 1200, height: 630 };

/** Tarjeta OG de un producto: wordmark, subtítulo, nombre y precio sobre negro. */
export async function productOgImage(slug: string): Promise<ImageResponse> {
  const p = await loadProduct(slug);
  const name = p?.name ?? "Neon Night";
  const subtitle = p?.subtitle ?? "Relojes, joyas y perfumes verificados";
  const price = p ? `${p.priceFrom ? "Desde " : ""}${p.price.formatted}` : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "#000", color: "#fff", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: 6, width: "100%", background: "#FF006E" }} />
        <div style={{ fontSize: 22, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 600, marginBottom: 32 }}>NEON NIGHT</div>
        <div style={{ fontSize: 20, letterSpacing: "0.18em", textTransform: "uppercase", color: "#A1A1A1" }}>{subtitle}</div>
        <div style={{ fontSize: 80, lineHeight: 1, letterSpacing: -2, textTransform: "uppercase", fontWeight: 500, marginTop: 14 }}>{name}</div>
        {price && <div style={{ fontSize: 34, fontWeight: 200, marginTop: 20 }}>{price}</div>}
      </div>
    ),
    OG_SIZE,
  );
}
