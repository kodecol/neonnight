import { ImageResponse } from "next/og";
import { getContainer } from "@/infrastructure/container";
import { ListLines } from "@/application/use-cases/list-lines";
import { OG_COLORS as C, ogFonts, ogIsotype, ogIsotypeHeight, ogPhoto } from "./brand";

/** Tarjeta de vista previa general (lineSlug null) o de una línea. 1200 × 630, PNG. */
const SIZE = { width: 1200, height: 630 };

export async function homeCard(lineSlug: string | null): Promise<ImageResponse | null> {
  const container = getContainer();
  const [site, lines, products, fonts] = await Promise.all([container.content.get(), new ListLines(container).execute(), container.products.findAll(), ogFonts()]);
  const iso = await ogIsotype(site.brand.isotype);
  const line = lineSlug ? (lines.find((l) => l.slug === lineSlug) ?? null) : null;
  if (lineSlug && !line) return null;

  const brandRow = (
    <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={iso} width={58} height={ogIsotypeHeight(58, site.brand.isotype)} alt="" />
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "0.32em" }}>{site.brand.wordmark}</div>
    </div>
  );
  // En la tarjeta de línea la columna de texto es más angosta: la franja va más pequeña.
  const claims = (size: number) => (
    <div style={{ display: "flex", gap: size, fontSize: size, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: C.ink2 }}>
      <span>Verificadas</span>
      <span style={{ color: C.accent }}>·</span>
      <span>Garantía {site.policies.warrantyMonths} meses</span>
      <span style={{ color: C.accent }}>·</span>
      <span>Envío asegurado</span>
    </div>
  );

  let body: React.ReactElement;
  if (line) {
    const cover = ogPhoto(line.cover?.src, 640, "jpg");
    body = (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: cover ? 700 : 1200, padding: "64px 72px" }}>
          {brandRow}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent }}>Colección</div>
            <div style={{ fontSize: 96, fontWeight: 500, lineHeight: 1, letterSpacing: -3, textTransform: "uppercase", marginTop: 18 }}>{line.label}</div>
            <div style={{ fontSize: 28, fontWeight: 200, lineHeight: 1.35, color: C.ink2, marginTop: 26, maxWidth: 540 }}>{line.description}</div>
          </div>
          {claims(15)}
        </div>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} width={500} height={630} alt="" style={{ objectFit: "cover", borderLeft: `1px solid ${C.divider}` }} />
        )}
      </div>
    );
  } else {
    // Una pieza por línea, en el orden del menú.
    const picks = lines
      .map((l) => ogPhoto(products.find((p) => p.line === l.slug && ogPhoto(p.media.front?.src, 10, "png"))?.media.front?.src, 420, "png"))
      .filter((s): s is string => s !== null)
      .slice(0, 3);
    body = (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "64px 72px" }}>
        {brandRow}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 58, fontWeight: 500, lineHeight: 1.04, letterSpacing: -1.5, textTransform: "uppercase", maxWidth: picks.length ? 600 : 900 }}>
            Relojes, joyas y perfumes de las grandes casas
          </div>
          {picks.length > 0 && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              {picks.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} width={i === 1 ? 160 : 130} height={i === 1 ? 160 : 130} alt="" style={{ objectFit: "contain" }} />
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.divider}`, paddingTop: 26 }}>
          {claims(18)}
          <div style={{ display: "flex", fontSize: 19, fontWeight: 200, color: C.ink2 }}>Bogotá · Envíos a toda Colombia</div>
        </div>
      </div>
    );
  }

  return new ImageResponse(
    (
      <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", background: C.bg, color: C.ink, fontFamily: "Archivo" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 6, background: C.accent }} />
        {body}
      </div>
    ),
    { ...SIZE, fonts },
  );
}
