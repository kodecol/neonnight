import { z } from "zod";
import { DOCUMENT_TYPES } from "@/domain/entities/order";

/** Departamentos de Colombia (y Bogotá D.C.) para la dirección de entrega. */
export const DEPARTMENTS = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó",
  "Córdoba", "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo",
  "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada",
] as const;

export const DOCUMENT_LABEL: Record<(typeof DOCUMENT_TYPES)[number], string> = { CC: "Cédula de ciudadanía", CE: "Cédula de extranjería", NIT: "NIT", PP: "Pasaporte" };

const text = (min: number, max: number, msg: string) => z.string().trim().min(min, msg).max(max);

/** Celular colombiano: 10 dígitos que empiezan por 3, con o sin +57. Se guarda como "+57 300 123 4567". */
const mobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s().-]/g, "").replace(/^\+?57(?=3\d{9}$)/, ""))
  .refine((v) => /^3\d{9}$/.test(v), "Escribe un celular colombiano de 10 dígitos (3XX XXX XXXX).")
  .transform((v) => `+57 ${v.slice(0, 3)} ${v.slice(3, 6)} ${v.slice(6)}`);

export const CustomerInputSchema = z
  .object({
    name: text(3, 80, "Escribe tu nombre completo."),
    documentType: z.enum(DOCUMENT_TYPES),
    documentNumber: z.string().trim().max(20),
    email: z.string().trim().toLowerCase().max(120).email("Escribe un correo válido."),
    phone: mobile,
    address: text(5, 120, "Escribe la dirección de entrega."),
    city: text(2, 60, "Escribe la ciudad o municipio."),
    department: z.enum(DEPARTMENTS, { message: "Elige el departamento." }),
    notes: z.string().trim().max(300).default(""),
  })
  .superRefine((c, ctx) => {
    const ok = c.documentType === "PP" ? /^[A-Za-z0-9]{5,20}$/.test(c.documentNumber) : /^\d{5,12}(-\d)?$/.test(c.documentNumber);
    if (!ok) ctx.addIssue({ code: "custom", path: ["documentNumber"], message: c.documentType === "NIT" ? "Escribe el NIT, con o sin dígito de verificación (900123456-7)." : "Revisa el número de documento." });
  });
export type CustomerInput = z.input<typeof CustomerInputSchema>;

export const ConsentInputSchema = z.object({
  /** Casilla obligatoria: acepta los términos y la política de privacidad. */
  accepted: z.literal(true, { message: "Debes aceptar los términos y la política de privacidad." }),
  termsVersion: z.string().min(1).max(20),
  privacyVersion: z.string().min(1).max(20),
});

/** Versión vigente de cada documento que el cliente acepta en el checkout. */
export interface LegalVersions {
  terms: { version: string; updatedAt: string };
  privacy: { version: string; updatedAt: string };
}

/** Lo que /checkout necesita del servidor antes de pagar. */
export interface CheckoutQuoteDto {
  lines: Array<{
    productId: string;
    variantId: string;
    variantLabel: string;
    kind: string;
    slug: string;
    name: string;
    subtitle: string;
    quantity: number;
    unitPrice: { cents: number; formatted: string };
    lineTotal: { cents: number; formatted: string };
    /** Problema que impide pagar esta línea (agotada, menos stock…); null si está bien. */
    problem: string | null;
    maxQuantity: number;
  }>;
  subtotal: { cents: number; formatted: string };
  shipping: { cents: number; formatted: string; label: string };
  total: { cents: number; formatted: string };
  /** Se puede pagar todo tal como está. */
  ready: boolean;
}
