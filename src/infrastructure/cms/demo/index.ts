import type { DemoPack } from "./build";
import { ECOMMERCE } from "./ecommerce";
import { JOYERIA } from "./joyeria";
import { PERFUMERIA } from "./perfumeria";
import { RELOJERIA } from "./relojeria";

export type { DemoPack } from "./build";

/**
 * Catálogos de demo para `seed --niche <nicho>` al instalar la plantilla en un
 * cliente nuevo. Son neutros: casas, modelos y textos ficticios, sin nada del
 * catálogo real ni marcas registradas; ids con prefijo `demo-` para no chocar
 * con datos existentes. `vacio` deja la tienda sin catálogo.
 */
export const DEMO_NICHES = ["relojeria", "joyeria", "perfumeria", "ecommerce", "vacio"] as const;
export type DemoNiche = (typeof DEMO_NICHES)[number];

const VACIO: DemoPack = { lines: [], categories: [], brands: [], products: [] };

const PACKS: Record<DemoNiche, DemoPack> = {
  relojeria: RELOJERIA,
  joyeria: JOYERIA,
  perfumeria: PERFUMERIA,
  ecommerce: ECOMMERCE,
  vacio: VACIO,
};

/** Pack de un nicho. Devuelve copias de las listas: quien siembra puede ordenarlas o filtrarlas sin tocar las de otros. */
export function demoPack(niche: DemoNiche): DemoPack {
  const pack = PACKS[niche];
  return { lines: [...pack.lines], categories: [...pack.categories], brands: [...pack.brands], products: [...pack.products] };
}

export const isDemoNiche = (value: string): value is DemoNiche => (DEMO_NICHES as readonly string[]).includes(value);
