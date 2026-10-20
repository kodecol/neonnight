"use client";
import type { ProductSpecsInput } from "@/application/dto/admin.dto";
import { PERFUME_GENDERS } from "@/domain/entities/product";
import { Select, TextArea, TextInput } from "./fields";

/**
 * Ficha técnica editable según la plantilla de la línea. Números y listas se
 * editan como texto y se convierten al guardar (`specsToInput`).
 */
export type SpecsDraft =
  | { kind: "reloj"; movement: string; powerReserve: string; caseMm: string; caseMaterial: string; crystal: string; waterResistance: string }
  | { kind: "joya"; metal: string; stones: string; carat: string; weight: string; dimensions: string; certificate: string }
  | { kind: "perfume"; concentration: string; gender: (typeof PERFUME_GENDERS)[number]; perfumer: string; year: string; top: string; heart: string; base: string }
  | { kind: "general"; rows: string };

const str = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));
const digits = (s: string) => s.replace(/\D/g, "");
const intOrNull = (s: string): number | null => (digits(s) === "" ? null : Number(digits(s)));
const decimalOrNull = (s: string): number | null => {
  const n = Number(s.replace(",", ".").replace(/[^\d.]/g, ""));
  return s.trim() === "" || !Number.isFinite(n) ? null : n;
};
const list = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
const orNull = (s: string) => (s.trim() ? s.trim() : null);

export function specsToDraft(s: ProductSpecsInput): SpecsDraft {
  switch (s.kind) {
    case "reloj":
      return { kind: "reloj", movement: s.movement, powerReserve: str(s.powerReserveHours), caseMm: str(s.caseMm), caseMaterial: s.caseMaterial, crystal: s.crystal, waterResistance: str(s.waterResistanceM) };
    case "joya":
      return { kind: "joya", metal: s.metal, stones: s.stones ?? "", carat: str(s.caratTotal), weight: str(s.weightGrams), dimensions: s.dimensions ?? "", certificate: s.certificate ?? "" };
    case "perfume":
      return { kind: "perfume", concentration: s.concentration, gender: s.gender, perfumer: s.perfumer ?? "", year: str(s.year), top: s.notes.top.join(", "), heart: s.notes.heart.join(", "), base: s.notes.base.join(", ") };
    case "general":
      return { kind: "general", rows: s.rows.map((r) => `${r.label}: ${r.value}`).join("\n") };
  }
}

export function specsToInput(d: SpecsDraft): ProductSpecsInput {
  switch (d.kind) {
    case "reloj":
      return {
        kind: "reloj",
        movement: d.movement,
        powerReserveHours: intOrNull(d.powerReserve),
        caseMm: decimalOrNull(d.caseMm) ?? 0,
        caseMaterial: d.caseMaterial,
        crystal: d.crystal,
        waterResistanceM: intOrNull(d.waterResistance),
      };
    case "joya":
      return { kind: "joya", metal: d.metal, stones: orNull(d.stones), caratTotal: decimalOrNull(d.carat), weightGrams: decimalOrNull(d.weight), dimensions: orNull(d.dimensions), certificate: orNull(d.certificate) };
    case "perfume":
      return { kind: "perfume", concentration: d.concentration, gender: d.gender, perfumer: orNull(d.perfumer), year: intOrNull(d.year), notes: { top: list(d.top), heart: list(d.heart), base: list(d.base) } };
    case "general":
      return {
        kind: "general",
        rows: d.rows
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            const i = l.indexOf(":");
            return i === -1 ? { label: l, value: "" } : { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
          }),
      };
  }
}

const GENDERS = [
  { value: "femenino", label: "Femenino" },
  { value: "masculino", label: "Masculino" },
  { value: "unisex", label: "Unisex" },
] as const;

export function SpecsFields({ value, onChange, err }: { value: SpecsDraft; onChange: (next: SpecsDraft) => void; err: (key: string) => string | undefined }) {
  // Actualiza un campo conservando la plantilla (el tipo lo garantiza el `kind` del borrador).
  const set = (patch: Record<string, string>) => onChange({ ...value, ...patch } as SpecsDraft);
  switch (value.kind) {
    case "reloj":
      return (
        <div className="grid gap-6 md:grid-cols-2">
          <TextInput className="md:col-span-2" label="Movimiento" value={value.movement} onChange={(e) => set({ movement: e.target.value })} error={err("specs.movement")} placeholder="Automático · Cal. 3235" />
          <TextInput label="Caja (mm)" inputMode="decimal" value={value.caseMm} onChange={(e) => set({ caseMm: e.target.value })} error={err("specs.caseMm")} />
          <TextInput label="Material" value={value.caseMaterial} onChange={(e) => set({ caseMaterial: e.target.value })} error={err("specs.caseMaterial")} placeholder="Acero Oystersteel" />
          <TextInput label="Reserva de marcha (h)" inputMode="numeric" value={value.powerReserve} onChange={(e) => set({ powerReserve: digits(e.target.value) })} error={err("specs.powerReserveHours")} hint="Vacío si no aplica." />
          <TextInput label="Hermeticidad (m)" inputMode="numeric" value={value.waterResistance} onChange={(e) => set({ waterResistance: digits(e.target.value) })} error={err("specs.waterResistanceM")} hint="Vacío si no aplica." />
          <TextInput label="Cristal" value={value.crystal} onChange={(e) => set({ crystal: e.target.value })} error={err("specs.crystal")} />
        </div>
      );
    case "joya":
      return (
        <div className="grid gap-6 md:grid-cols-2">
          <TextInput className="md:col-span-2" label="Metal" value={value.metal} onChange={(e) => set({ metal: e.target.value })} error={err("specs.metal")} placeholder="Oro amarillo 18 k" />
          <TextInput label="Piedras" value={value.stones} onChange={(e) => set({ stones: e.target.value })} error={err("specs.stones")} placeholder="Diamante talla brillante" hint="Vacío si no lleva." />
          <TextInput label="Quilataje total (ct)" inputMode="decimal" value={value.carat} onChange={(e) => set({ carat: e.target.value })} error={err("specs.caratTotal")} />
          <TextInput label="Peso (g)" inputMode="decimal" value={value.weight} onChange={(e) => set({ weight: e.target.value })} error={err("specs.weightGrams")} />
          <TextInput label="Medidas" value={value.dimensions} onChange={(e) => set({ dimensions: e.target.value })} error={err("specs.dimensions")} placeholder="Largo 42 cm" />
          <TextInput className="md:col-span-2" label="Certificado" value={value.certificate} onChange={(e) => set({ certificate: e.target.value })} error={err("specs.certificate")} placeholder="Certificado de la casa, GIA…" />
        </div>
      );
    case "perfume":
      return (
        <div className="grid gap-6 md:grid-cols-2">
          <TextInput label="Concentración" value={value.concentration} onChange={(e) => set({ concentration: e.target.value })} error={err("specs.concentration")} placeholder="Eau de Parfum" />
          <Select label="Para" value={value.gender} onChange={(e) => set({ gender: e.target.value })} options={GENDERS} />
          <TextInput label="Perfumista" value={value.perfumer} onChange={(e) => set({ perfumer: e.target.value })} error={err("specs.perfumer")} />
          <TextInput label="Año de lanzamiento" inputMode="numeric" value={value.year} onChange={(e) => set({ year: digits(e.target.value).slice(0, 4) })} error={err("specs.year")} />
          <TextArea className="md:col-span-2" rows={2} label="Notas de salida" value={value.top} onChange={(e) => set({ top: e.target.value })} error={err("specs.notes.top")} hint="Separadas por comas." />
          <TextArea className="md:col-span-2" rows={2} label="Notas de corazón" value={value.heart} onChange={(e) => set({ heart: e.target.value })} error={err("specs.notes.heart")} />
          <TextArea className="md:col-span-2" rows={2} label="Notas de fondo" value={value.base} onChange={(e) => set({ base: e.target.value })} error={err("specs.notes.base")} />
        </div>
      );
    case "general":
      return (
        <TextArea
          label="Características"
          rows={6}
          value={value.rows}
          onChange={(e) => set({ rows: e.target.value })}
          error={err("specs.rows") ?? err("specs")}
          hint={'Una por línea, con el formato "Etiqueta: valor".'}
          placeholder={"Material: Acetato\nMedidas: 52 × 18 mm"}
        />
      );
  }
}
