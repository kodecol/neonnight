import { ImageResponse } from "next/og";
import { getContainer } from "@/infrastructure/container";
import { GetWatchBySlug } from "@/application/use-cases/get-watch-by-slug";
import { WatchNotFoundError } from "@/domain/errors";

export const dynamic = "force-dynamic";
export const alt = "Neon Night";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let name = "Neon Night";
  let subtitle = "Relojes de lujo verificados";
  let price = "";
  try {
    const w = await new GetWatchBySlug(getContainer().watches).execute(slug);
    name = w.name;
    subtitle = w.subtitle;
    price = w.price.formatted;
  } catch (e) {
    if (!(e instanceof WatchNotFoundError)) throw e;
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "#000", color: "#fff", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: 6, width: "100%", background: "#FF006E" }} />
        <div style={{ fontSize: 22, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 600, marginBottom: 32 }}>NEON NIGHT</div>
        <div style={{ fontSize: 20, letterSpacing: "0.18em", textTransform: "uppercase", color: "#A1A1A1" }}>{subtitle}</div>
        <div style={{ fontSize: 88, lineHeight: 1, letterSpacing: -2, textTransform: "uppercase", fontWeight: 500, marginTop: 14 }}>{name}</div>
        {price && <div style={{ fontSize: 34, fontWeight: 200, marginTop: 20 }}>{price}</div>}
      </div>
    ),
    size,
  );
}
