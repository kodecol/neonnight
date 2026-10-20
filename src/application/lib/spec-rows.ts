import type { PerfumeGender, Product } from "@/domain/entities/product";

const num = (n: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(n);

export const GENDER_LABEL: Record<PerfumeGender, string> = { femenino: "Femenino", masculino: "Masculino", unisex: "Unisex" };

/**
 * Ficha técnica legible según la plantilla. Las filas opcionales vacías se
 * omiten para que la tabla no se llene de guiones.
 */
export function specRows(p: Product): Array<{ label: string; value: string }> {
  const rows: Array<[string, string | null]> = [];
  const s = p.specs;
  switch (s.kind) {
    case "reloj":
      rows.push(
        ["Movimiento", s.movement],
        ["Reserva de marcha", s.powerReserveHours === null ? "—" : `${s.powerReserveHours} horas`],
        ["Caja", `${num(s.caseMm)} mm · ${s.caseMaterial}`],
        ["Cristal", s.crystal],
        ["Hermeticidad", s.waterResistanceM === null ? "—" : `${s.waterResistanceM} m`],
      );
      break;
    case "joya":
      rows.push(
        ["Metal", s.metal],
        ["Piedras", s.stones],
        ["Quilataje total", s.caratTotal === null ? null : `${num(s.caratTotal)} ct`],
        ["Peso", s.weightGrams === null ? null : `${num(s.weightGrams)} g`],
        ["Medidas", s.dimensions],
        ["Certificado", s.certificate],
      );
      if (p.variants.length > 1) rows.push(["Tallas", p.variants.map((v) => v.label).join(" · ")]);
      break;
    case "perfume":
      rows.push(
        ["Concentración", s.concentration],
        ["Género", GENDER_LABEL[s.gender]],
        ["Presentaciones", p.variants.map((v) => v.label).filter(Boolean).join(" · ") || null],
        ["Perfumista", s.perfumer],
        ["Lanzamiento", s.year === null ? null : String(s.year)],
      );
      break;
    case "general":
      rows.push(...s.rows.map((r): [string, string] => [r.label, r.value]));
      break;
  }
  if (p.includes.length > 0) rows.push(["Incluye", p.includes.join(", ")]);
  return rows.flatMap(([label, value]) => (value ? [{ label, value }] : []));
}
