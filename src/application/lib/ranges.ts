/**
 * Tramos dinámicos a partir de valores reales (precios, milímetros,
 * mililitros). Funciones puras: si el catálogo crece, lo mismo se puede
 * calcular con una agregación de Mongo ($bucketAuto) sin cambiar la interfaz.
 */

/** Rango cerrado [min, max]; null = sin límite por ese lado. */
export interface NumRange {
  min: number | null;
  max: number | null;
}

const NICE = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 7.5, 8, 9, 10];

/** Redondea a una cifra "bonita" del mismo orden de magnitud (37 412 000 → 40 000 000; 1 380 000 → 1 500 000). */
export function niceRound(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 0;
  const e = 10 ** Math.floor(Math.log10(x));
  const m = x / e;
  let best = NICE[0]!;
  for (const n of NICE) if (Math.abs(n - m) < Math.abs(best - m)) best = n;
  return Math.round(best * e);
}

/** Paso cómodo para un campo numérico según la magnitud (200 millones → 1 millón; 2 millones → 10 mil). */
export function niceStep(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 1;
  return Math.max(1, 10 ** (Math.floor(Math.log10(max)) - 2));
}

/**
 * Cortes entre tramos por cuantiles, redondeados con `round`. Garantiza que
 * cada tramo resultante tenga al menos un valor: un corte c deja a la
 * izquierda los valores ≤ c. Con menos de dos valores distintos no hay tramos.
 */
export function quantileCuts(values: readonly number[], round: (x: number) => number, maxBuckets = 4): number[] {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  const distinct = new Set(sorted).size;
  if (distinct < 2) return [];
  const k = Math.min(maxBuckets, distinct >= 6 ? 4 : distinct >= 4 ? 3 : 2);
  const n = sorted.length;
  let cuts: number[] = [];
  for (let i = 1; i < k; i++) {
    const idx = Math.floor((i * n) / k);
    // Punto medio entre vecinos: el corte cae entre dos valores reales.
    const mid = (sorted[Math.max(0, idx - 1)]! + sorted[Math.min(n - 1, idx)]!) / 2;
    cuts.push(round(mid));
  }
  const min = sorted[0]!;
  const max = sorted[n - 1]!;
  cuts = [...new Set(cuts)].filter((c) => c >= min && c < max).sort((a, b) => a - b);
  // Quita cortes que dejan un tramo vacío.
  const bucketOf = (v: number, cs: number[]) => cs.findIndex((c) => v <= c);
  let changed = true;
  while (changed && cuts.length > 0) {
    changed = false;
    const counts = new Array(cuts.length + 1).fill(0) as number[];
    for (const v of sorted) {
      const b = bucketOf(v, cuts);
      counts[b === -1 ? cuts.length : b]!++;
    }
    const empty = counts.findIndex((c) => c === 0);
    if (empty !== -1) {
      cuts.splice(Math.min(empty, cuts.length - 1), 1);
      changed = true;
    }
  }
  return cuts;
}

/** Tramos de los cortes: (−∞, c1], (c1, c2], …, (cN, ∞). */
export function bucketsFromCuts(cuts: readonly number[]): Array<{ lo: number | null; hi: number | null }> {
  if (cuts.length === 0) return [];
  return [...cuts, null].map((hi, i) => ({ lo: i === 0 ? null : cuts[i - 1]!, hi }));
}

/** Índice del tramo de `v` (los extremos superiores son inclusivos). */
export function bucketIndex(v: number, cuts: readonly number[]): number {
  const i = cuts.findIndex((c) => v <= c);
  return i === -1 ? cuts.length : i;
}

/** "hasta-20000000", "20000001-60000000", "desde-150000001". */
export function encodeRange(r: NumRange): string {
  if (r.min !== null && r.max !== null) return `${r.min}-${r.max}`;
  if (r.max !== null) return `hasta-${r.max}`;
  if (r.min !== null) return `desde-${r.min}`;
  return "";
}

const toInt = (s: string | undefined): number | null => {
  if (s === undefined) return null;
  const digits = s.replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
};

/** Lee un rango de la URL; también acepta los valores de los tramos fijos de antes. Inválido → null. */
export function parseRange(raw: string | undefined): NumRange | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  let r: NumRange | null = null;
  if (v.startsWith("hasta-")) r = { min: null, max: toInt(v.slice(6)) };
  else if (v.startsWith("desde-")) r = { min: toInt(v.slice(6)), max: null };
  else {
    const m = /^(\d+)?-(\d+)?$/.exec(v);
    if (m) r = { min: toInt(m[1]), max: toInt(m[2]) };
  }
  if (!r || (r.min === null && r.max === null)) return null;
  if (r.min !== null && r.max !== null && r.min > r.max) return { min: r.max, max: r.min };
  return r;
}

/** Rango desde dos campos de texto ("20.000.000", "$ 60 000 000"). Ambos vacíos → null. */
export function rangeFromInputs(min: string | undefined, max: string | undefined): NumRange | null {
  const r = { min: toInt(min), max: toInt(max) };
  if (r.min === null && r.max === null) return null;
  if (r.min !== null && r.max !== null && r.min > r.max) return { min: r.max, max: r.min };
  return r;
}

export const inRange = (v: number, r: NumRange) => (r.min === null || v >= r.min) && (r.max === null || v <= r.max);

const THOUSAND = 1_000;
const MILLION = 1_000_000;

/** "800 mil", "1,5 millones", "20 millones". */
export function amountLabel(units: number): string {
  if (units < MILLION) return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(units / THOUSAND)} mil`;
  const m = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(units / MILLION);
  return `${m} ${units === MILLION ? "millón" : "millones"}`;
}

/** Etiqueta de un rango de precio para el filtro activo y los tramos. */
export function priceRangeLabel(r: NumRange): string {
  if (r.min !== null && r.max !== null) return `De ${amountLabel(r.min)} a ${amountLabel(r.max)}`;
  if (r.max !== null) return `Hasta ${amountLabel(r.max)}`;
  return `Desde ${amountLabel(r.min ?? 0)}`;
}

export interface PriceTramo {
  range: NumRange;
  label: string;
}

/**
 * Tramos de precio sugeridos a partir de los precios reales (cuantiles
 * redondeados). Un tramo intermedio (c1, c2] se guarda como [c1 + 1, c2] para
 * que los tramos no se pisen. Con 0–1 precios distintos no hay tramos.
 */
export function priceTramos(prices: readonly number[]): PriceTramo[] {
  const cuts = quantileCuts(prices, niceRound);
  return bucketsFromCuts(cuts).map(({ lo, hi }) => {
    if (lo === null) return { range: { min: null, max: hi }, label: `Hasta ${amountLabel(hi!)}` };
    if (hi === null) return { range: { min: lo + 1, max: null }, label: `Más de ${amountLabel(lo)}` };
    return { range: { min: lo + 1, max: hi }, label: `De ${amountLabel(lo)} a ${amountLabel(hi)}` };
  });
}

export const sameRange = (a: NumRange | null, b: NumRange | null) => !!a && !!b && a.min === b.min && a.max === b.max;
