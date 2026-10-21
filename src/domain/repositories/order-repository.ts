import type { Order, OrderId, OrderStatus } from "../entities/order";

/** Filtros de la lista del panel. Sin `deleted`, solo pedidos activos (fuera de la papelera). */
export interface OrderQuery {
  status?: OrderStatus;
  /** true: solo la papelera. */
  deleted?: boolean;
  /** true: solo los marcados para revisar. */
  review?: boolean;
  /** Fecha de creación en [from, to). */
  from?: Date;
  to?: Date;
  /** Id, nombre, correo o celular (ver `orderSearchPatterns`). */
  search?: string;
}

export interface OrderRepository {
  /** Inserta o reemplaza por `id`. */
  save(order: Order): Promise<void>;
  /** Encuentra también los eliminados: /gracias y el webhook los necesitan. */
  findById(id: OrderId): Promise<Order | null>;
  findByPaymentReference(reference: string): Promise<Order | null>;
  /** Más recientes primero (la papelera, por fecha de eliminación). Sin `limit`, todos. */
  list(query?: OrderQuery & { limit?: number; offset?: number }): Promise<readonly Order[]>;
  count(query?: OrderQuery): Promise<number>;
  /** Purga definitiva (el caso de uso solo la permite desde la papelera). */
  remove(id: OrderId): Promise<void>;
  /** Purga los eliminados hace más de `ORDER_TRASH_DAYS`. Devuelve cuántos. */
  purgeExpired(now: Date): Promise<number>;
}
