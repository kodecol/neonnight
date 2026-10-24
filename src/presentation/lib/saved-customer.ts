import { DEPARTMENTS, DOCUMENT_LABEL } from "@/application/dto/checkout.dto";
import { storeKey } from "./store-key";

/** Datos del comprador que se pueden recordar (las notas son de cada pedido: no se guardan). */
export interface SavedCustomer {
  name: string;
  documentType: keyof typeof DOCUMENT_LABEL;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  department: string;
}

const KEY = () => storeKey("checkout.customer.v1");
const FIELDS = ["name", "documentNumber", "email", "phone", "address", "city", "department"] as const;

/**
 * Lee lo guardado en este navegador, si el comprador lo pidió. Solo vive en
 * localStorage: nunca viaja al servidor por sí solo. Un dato con otra forma
 * (versión vieja, editado a mano) se descarta entero.
 */
export function loadSavedCustomer(): SavedCustomer | null {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY()) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (!FIELDS.every((k) => typeof r[k] === "string" && (r[k] as string).length <= 160)) return null;
    if (typeof r.documentType !== "string" || !(r.documentType in DOCUMENT_LABEL)) return null;
    const department = (DEPARTMENTS as readonly string[]).includes(r.department as string) ? (r.department as string) : "";
    return { ...(Object.fromEntries(FIELDS.map((k) => [k, r[k]])) as Omit<SavedCustomer, "documentType">), documentType: r.documentType as SavedCustomer["documentType"], department };
  } catch {
    return null;
  }
}

export function saveCustomer(c: SavedCustomer): void {
  try {
    const data: SavedCustomer = { name: c.name, documentType: c.documentType, documentNumber: c.documentNumber, email: c.email, phone: c.phone, address: c.address, city: c.city, department: c.department };
    window.localStorage.setItem(KEY(), JSON.stringify(data));
  } catch {
    // Navegación privada o almacenamiento lleno: simplemente no se recuerda.
  }
}

export function forgetCustomer(): void {
  try {
    window.localStorage.removeItem(KEY());
  } catch {
    // Sin acceso al almacenamiento no hay nada que borrar.
  }
}
