import { productOgImage } from "../../_product/og-image";

export const dynamic = "force-dynamic";
export const alt = "Neon Night";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  return productOgImage((await params).slug);
}
