import { z } from "zod";
import {
  isDeletable,
  orderId,
  paymentLinkMayBeLive,
  purgeDate,
  withEvents,
  type Order,
  type OrderEventActor,
  type OrderEventType,
  type OrderStatus,
} from "@/domain/entities/order";
import { OrderNotDeletableError, OrderNotInTrashError } from "@/domain/errors";
import type { OrderQuery, OrderRepository } from "@/domain/repositories/order-repository";
import type { ProductRepository } from "@/domain/repositories/product-repository";
import { DOCUMENT_LABEL } from "../../dto/checkout.dto";
import { FieldValidationError } from "../../lib/errors";
import type { Clock } from "../../ports/clock";
import { markOrderPaid } from "../confirm-payment";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = { pendiente: "Pendiente", pagada: "Pagado", fallida: "Pago rechazado", cancelada: "Cancelado" };

export const ORDER_EVENT_LABEL: Record<OrderEventType, string> = {
  creado: "Pedido creado",
  pagado: "Pago confirmado",
  cancelado: "Pedido cancelado",
  fallido: "Pago rechazado",
  eliminado: "Movido a Eliminados",
  restaurado: "Restaurado de Eliminados",
  "pago-tras-eliminar": "Pago recibido estando eliminado",
  revisado: "Marcado como revisado",
};

export const ORDER_ACTOR_LABEL: Record<OrderEventActor, string> = { admin: "Panel", webhook: "Bold (webhook)", cliente: "Cliente" };

export const ORDER_PAGE_SIZE = 25;
/** Tope de filas del CSV: la tienda vende piezas de lujo, no miles de pedidos al día. */
const CSV_MAX_ROWS = 10_000;
/** Colombia no tiene horario de verano: las fechas del panel son siempre UTC-5. */
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;

/** Filtros de la lista tal como viajan en la URL (`?estado=&vista=eliminados&revisar=1&q=&desde=&hasta=&pagina=`). */
export interface AdminOrderFilters {
  status: OrderStatus | null;
  /** Vista "Eliminados" (papelera). */
  trash: boolean;
  /** Solo los marcados para revisar. */
  review: boolean;
  q: string;
  /** AAAA-MM-DD, hora de Bogotá; ambos inclusive. */
  from: string | null;
  to: string | null;
  page: number;
}

const isDay = (v: string | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseAdminOrderFilters(sp: Record<string, string | string[] | undefined>): AdminOrderFilters {
  const estado = first(sp.estado);
  const desde = first(sp.desde);
  const hasta = first(sp.hasta);
  const page = Number.parseInt(first(sp.pagina) ?? "", 10);
  return {
    status: estado && estado in ORDER_STATUS_LABEL ? (estado as OrderStatus) : null,
    trash: first(sp.vista) === "eliminados",
    review: first(sp.revisar) === "1",
    q: (first(sp.q) ?? "").trim().slice(0, 80),
    from: isDay(desde) ? desde : null,
    to: isDay(hasta) ? hasta : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Query string de la lista (sin la página 1 ni los valores vacíos) para enlaces y el CSV. */
export function orderFiltersQuery(f: AdminOrderFilters, over: Partial<AdminOrderFilters> = {}): string {
  const v = { ...f, ...over };
  const p = new URLSearchParams();
  if (v.trash) p.set("vista", "eliminados");
  if (v.status) p.set("estado", v.status);
  if (v.review) p.set("revisar", "1");
  if (v.q) p.set("q", v.q);
  if (v.from) p.set("desde", v.from);
  if (v.to) p.set("hasta", v.to);
  if (v.page > 1) p.set("pagina", String(v.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Medianoche de Bogotá del día dado (+`days`), en UTC. */
const bogotaDay = (day: string, days = 0) => new Date(Date.parse(`${day}T00:00:00Z`) - BOGOTA_OFFSET_MS + days * 24 * 60 * 60 * 1000);

const toQuery = (f: AdminOrderFilters): OrderQuery => ({
  status: f.status ?? undefined,
  deleted: f.trash || undefined,
  review: f.review || undefined,
  search: f.q || undefined,
  from: f.from ? bogotaDay(f.from) : undefined,
  to: f.to ? bogotaDay(f.to, 1) : undefined,
});

export interface AdminOrderRowDto {
  id: string;
  createdAt: string;
  status: OrderStatus;
  statusLabel: string;
  paymentMethod: Order["paymentMethod"];
  customer: string | null;
  city: string | null;
  items: number;
  total: string;
  deletedAt: string | null;
  /** Cuándo lo purga la papelera. */
  purgeAt: string | null;
  /** Fechas ya formateadas (hora de Bogotá) para la tabla del cliente: sin desajustes de hidratación. */
  labels: { createdAt: string; deletedAt: string | null; purgeAt: string | null };
  review: string | null;
  canDelete: boolean;
  /** Link de Bold creado hace menos de 30 min: el cliente aún podría pagar. */
  linkMayBeLive: boolean;
}

export interface AdminOrderListDto {
  rows: AdminOrderRowDto[];
  total: number;
  page: number;
  pages: number;
  /** Para las pestañas y el aviso: cuántos hay en la papelera y por revisar. */
  trashCount: number;
  reviewCount: number;
}

export interface AdminOrderDto extends AdminOrderRowDto {
  lines: Array<{ name: string; variantLabel: string; slug: string; quantity: number; unitPrice: string; lineTotal: string }>;
  subtotal: string;
  shipping: string;
  paymentReference: string | null;
  customerDetail: Order["customer"];
  consent: { termsVersion: string; privacyVersion: string; acceptedAt: string } | null;
  events: Array<{ at: string; type: OrderEventType; label: string; by: string; note: string | null }>;
  /** Acciones disponibles: solo los pedidos manuales se cambian a mano (Bold llega por webhook). */
  canMarkPaid: boolean;
  canCancel: boolean;
  /** En la papelera: restaurar o purgar. */
  canRestore: boolean;
}

const label = (d: Date) => d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
const dayLabel = (d: Date) => d.toLocaleDateString("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });

const row = (o: Order, now: Date): AdminOrderRowDto => ({
  id: o.id,
  createdAt: o.createdAt.toISOString(),
  status: o.status,
  statusLabel: ORDER_STATUS_LABEL[o.status],
  paymentMethod: o.paymentMethod,
  customer: o.customer?.name ?? null,
  city: o.customer ? `${o.customer.city}, ${o.customer.department}` : null,
  items: o.lines.reduce((n, l) => n + l.quantity, 0),
  total: o.total.format(),
  deletedAt: o.deletedAt?.toISOString() ?? null,
  purgeAt: purgeDate(o)?.toISOString() ?? null,
  labels: { createdAt: label(o.createdAt), deletedAt: o.deletedAt ? label(o.deletedAt) : null, purgeAt: o.deletedAt ? dayLabel(purgeDate(o)!) : null },
  review: o.review,
  canDelete: isDeletable(o),
  linkMayBeLive: paymentLinkMayBeLive(o, now),
});

type Deps = { orders: OrderRepository; clock: Clock };

/**
 * Lista paginada del panel. Antes de listar purga lo que lleva más de 30 días
 * en la papelera (no hay cron: basta con que alguien abra Pedidos).
 */
export class ListAdminOrders {
  constructor(private readonly deps: Deps) {}

  async execute(f: AdminOrderFilters): Promise<AdminOrderListDto> {
    const now = this.deps.clock.now();
    await this.deps.orders.purgeExpired(now);
    const query = toQuery(f);
    const [total, trashCount, reviewCount] = await Promise.all([this.deps.orders.count(query), this.deps.orders.count({ deleted: true }), this.deps.orders.count({ review: true })]);
    const pages = Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE));
    const page = Math.min(f.page, pages);
    const orders = await this.deps.orders.list({ ...query, limit: ORDER_PAGE_SIZE, offset: (page - 1) * ORDER_PAGE_SIZE });
    return { rows: orders.map((o) => row(o, now)), total, page, pages, trashCount, reviewCount };
  }
}

export class GetAdminOrder {
  constructor(private readonly deps: Deps) {}

  async execute(id: string): Promise<AdminOrderDto | null> {
    const o = await this.deps.orders.findById(orderId(id));
    if (!o) return null;
    const subtotal = o.lines.reduce((acc, l) => acc.add(l.unitPrice.multiply(l.quantity)), o.total.multiply(0));
    const active = o.deletedAt === null;
    return {
      ...row(o, this.deps.clock.now()),
      lines: o.lines.map((l) => ({ name: l.name, variantLabel: l.variantLabel, slug: l.slug, quantity: l.quantity, unitPrice: l.unitPrice.format(), lineTotal: l.unitPrice.multiply(l.quantity).format() })),
      subtotal: subtotal.format(),
      shipping: o.shipping.cents === 0 ? "Sin costo" : o.shipping.format(),
      paymentReference: o.paymentReference,
      customerDetail: o.customer,
      consent: o.consent ? { ...o.consent, acceptedAt: o.consent.acceptedAt.toISOString() } : null,
      events: o.events.map((e) => ({ at: e.at.toISOString(), type: e.type, label: ORDER_EVENT_LABEL[e.type], by: ORDER_ACTOR_LABEL[e.by], note: e.note ?? null })),
      canMarkPaid: active && o.paymentMethod === "manual" && o.status === "pendiente",
      canCancel: active && o.status === "pendiente",
      canRestore: !active,
    };
  }
}

async function load(orders: OrderRepository, id: string): Promise<Order> {
  const o = await orders.findById(orderId(id));
  if (!o) throw new FieldValidationError("id", "El pedido no existe.");
  return o;
}

/**
 * Cambia a mano el estado de un pedido pendiente: "pagada" (solo pedidos
 * manuales; descuenta stock) o "cancelada". Devuelve las piezas que quedaron
 * sin stock suficiente, para revisarlas.
 */
export class UpdateOrderStatus {
  constructor(private readonly deps: { orders: OrderRepository; products: ProductRepository; clock: Clock }) {}

  async execute(id: string, next: "pagada" | "cancelada"): Promise<{ short: string[] }> {
    const o = await load(this.deps.orders, id);
    if (o.deletedAt) throw new FieldValidationError("status", "El pedido está en Eliminados: restáuralo primero.");
    if (o.status !== "pendiente") throw new FieldValidationError("status", `El pedido ya está ${ORDER_STATUS_LABEL[o.status].toLowerCase()}.`);
    const at = this.deps.clock.now();
    if (next === "pagada") {
      if (o.paymentMethod !== "manual") throw new FieldValidationError("status", "Los pagos con Bold se confirman solos por el webhook.");
      return { short: await markOrderPaid(o, this.deps, "admin", at) };
    }
    await this.deps.orders.save(withEvents({ ...o, status: "cancelada" }, { at, type: "cancelado", by: "admin" }));
    return { short: [] };
  }
}

const IdsSchema = z.array(z.string().min(1).max(64)).min(1, "Selecciona al menos un pedido.").max(100, "Elimina como máximo 100 pedidos a la vez.");

/**
 * Mueve pedidos pendientes a la papelera (borrado suave, 30 días). Valida
 * todos antes de tocar ninguno: si uno no se puede eliminar, no se elimina
 * nada. Pagados, cancelados y rechazados quedan como registro.
 */
export class DeleteOrders {
  constructor(private readonly deps: Deps) {}

  async execute(rawIds: unknown): Promise<{ deleted: string[] }> {
    const ids = [...new Set(IdsSchema.parse(rawIds))];
    const orders = await Promise.all(ids.map((id) => load(this.deps.orders, id)));
    for (const o of orders) {
      if (o.deletedAt) throw new OrderNotDeletableError(o.id, "ya está en Eliminados");
      if (!isDeletable(o)) throw new OrderNotDeletableError(o.id, `está ${ORDER_STATUS_LABEL[o.status].toLowerCase()}`);
    }
    const at = this.deps.clock.now();
    await Promise.all(orders.map((o) => this.deps.orders.save(withEvents({ ...o, deletedAt: at }, { at, type: "eliminado", by: "admin" }))));
    return { deleted: orders.map((o) => o.id) };
  }
}

/** Saca un pedido de la papelera tal como estaba. */
export class RestoreOrder {
  constructor(private readonly deps: Deps) {}

  async execute(id: string): Promise<void> {
    const o = await load(this.deps.orders, id);
    if (!o.deletedAt) throw new OrderNotInTrashError(o.id);
    const at = this.deps.clock.now();
    await this.deps.orders.save(withEvents({ ...o, deletedAt: null }, { at, type: "restaurado", by: "admin" }));
  }
}

/** Purga definitiva: solo desde la papelera (un pedido activo hay que eliminarlo antes). */
export class PurgeOrder {
  constructor(private readonly orders: OrderRepository) {}

  async execute(id: string): Promise<void> {
    const o = await load(this.orders, id);
    if (!o.deletedAt) throw new OrderNotInTrashError(o.id);
    await this.orders.remove(o.id);
  }
}

/** Quita la marca de revisión (p. ej. tras revisar un pago que llegó a un pedido eliminado). */
export class MarkOrderReviewed {
  constructor(private readonly deps: Deps) {}

  async execute(id: string): Promise<void> {
    const o = await load(this.deps.orders, id);
    if (!o.review) return;
    const at = this.deps.clock.now();
    await this.deps.orders.save(withEvents({ ...o, review: null }, { at, type: "revisado", by: "admin", note: o.review }));
  }
}

/** Fecha y hora de Bogotá legible en una hoja de cálculo: AAAA-MM-DD HH:MM. */
const csvDate = (d: Date) => new Date(d.getTime() + BOGOTA_OFFSET_MS).toISOString().slice(0, 16).replace("T", " ");

/**
 * Celda CSV: entre comillas si hace falta y con apóstrofo delante si empieza
 * como fórmula (=, +, -, @): un nombre o una nota no deben ejecutarse en Excel.
 */
function cell(value: string | number | null | undefined): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_HEADER = ["Pedido", "Fecha", "Estado", "Pago", "Cliente", "Documento", "Correo", "Celular", "Dirección", "Ciudad", "Departamento", "Piezas", "Unidades", "Total COP", "Referencia de pago", "Revisar", "Eliminado"];

/**
 * CSV de lo que muestra la lista con los mismos filtros (todas las páginas).
 * Separado por punto y coma y con BOM: Excel en español lo abre en columnas y
 * con tildes. Lleva datos personales: solo lo descarga el panel.
 */
export class ExportOrdersCsv {
  constructor(private readonly orders: OrderRepository) {}

  async execute(f: AdminOrderFilters): Promise<string> {
    const orders = await this.orders.list({ ...toQuery(f), limit: CSV_MAX_ROWS });
    const rows = orders.map((o) => {
      const c = o.customer;
      return [
        o.id,
        csvDate(o.createdAt),
        ORDER_STATUS_LABEL[o.status],
        o.paymentMethod === "bold" ? "Bold" : "Manual",
        c?.name,
        c ? `${DOCUMENT_LABEL[c.documentType]} ${c.documentNumber}` : null,
        c?.email,
        c?.phone,
        c?.address,
        c?.city,
        c?.department,
        o.lines.map((l) => `${l.name}${l.variantLabel ? ` (${l.variantLabel})` : ""} ×${l.quantity}`).join(" | "),
        o.lines.reduce((n, l) => n + l.quantity, 0),
        o.total.units,
        o.paymentReference,
        o.review,
        o.deletedAt ? csvDate(o.deletedAt) : null,
      ];
    });
    return `﻿${[CSV_HEADER, ...rows].map((r) => r.map(cell).join(";")).join("\r\n")}\r\n`;
  }
}
