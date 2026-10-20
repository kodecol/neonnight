/**
 * Formato de los identificadores de medición. Se validan antes de llegar a
 * una etiqueta <script>: un valor mal puesto en el entorno no se ejecuta.
 */
export const isGaMeasurementId = (v: string) => /^G-[A-Z0-9]{4,20}$/.test(v);
export const isMetaPixelId = (v: string) => /^\d{8,20}$/.test(v);

export interface TrackingIds {
  gaId: string | null;
  pixelId: string | null;
}

export function trackingIds(env: { ga?: string; pixel?: string }): TrackingIds {
  const ga = env.ga?.trim() ?? "";
  const pixel = env.pixel?.trim() ?? "";
  return { gaId: isGaMeasurementId(ga) ? ga : null, pixelId: isMetaPixelId(pixel) ? pixel : null };
}
