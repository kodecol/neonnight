import type { Metadata } from "next";
import { InfoRoute, infoMetadata } from "../_info/render-info";

/** Dinámica como el resto de la tienda: el layout lee la configuración en runtime. */
export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return infoMetadata("devoluciones");
}

export default function Page() {
  return <InfoRoute slug="devoluciones" />;
}
