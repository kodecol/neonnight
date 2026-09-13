import type { Watch } from "../entities/watch";

export function isPurchasable(watch: Watch): boolean {
  return watch.availability === "disponible";
}

/** Los relojes son piezas únicas: cada línea vale exactamente una unidad. */
export const MAX_QUANTITY_PER_WATCH = 1;
