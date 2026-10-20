/**
 * Eventos de comercio de la tienda y su traducción a Google Analytics 4
 * (comercio electrónico) y al píxel de Meta (eventos estándar). Funciones
 * puras: el envío vive en `track.ts`.
 */
export interface TrackItem {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  /** Presentación ("100 ml", "Talla 17"). */
  variant?: string;
  priceCents: number;
  quantity?: number;
}

export type StoreEvent =
  | { name: "view_item_list"; listName: string; items: TrackItem[] }
  | { name: "view_item"; item: TrackItem }
  | { name: "add_to_cart"; item: TrackItem }
  | { name: "begin_checkout"; items: TrackItem[]; valueCents: number }
  | { name: "purchase"; orderId: string; valueCents: number; items: TrackItem[] }
  | { name: "contact"; channel: "whatsapp"; location: string };

const CURRENCY = "COP";
const pesos = (cents: number) => Math.trunc(cents / 100);
const qty = (i: TrackItem) => i.quantity ?? 1;

function gaItem(i: TrackItem, index?: number) {
  return {
    item_id: i.id,
    item_name: i.name,
    ...(i.brand ? { item_brand: i.brand } : {}),
    ...(i.category ? { item_category: i.category } : {}),
    ...(i.variant ? { item_variant: i.variant } : {}),
    price: pesos(i.priceCents),
    quantity: qty(i),
    ...(index !== undefined ? { index } : {}),
  };
}

const total = (items: TrackItem[]) => items.reduce((n, i) => n + i.priceCents * qty(i), 0);

export function toGa(e: StoreEvent): [string, Record<string, unknown>] {
  switch (e.name) {
    case "view_item_list":
      return ["view_item_list", { item_list_name: e.listName, items: e.items.map((i, n) => gaItem(i, n)) }];
    case "view_item":
    case "add_to_cart":
      return [e.name, { currency: CURRENCY, value: pesos(e.item.priceCents * qty(e.item)), items: [gaItem(e.item)] }];
    case "begin_checkout":
      return ["begin_checkout", { currency: CURRENCY, value: pesos(e.valueCents), items: e.items.map((i) => gaItem(i)) }];
    case "purchase":
      return ["purchase", { transaction_id: e.orderId, currency: CURRENCY, value: pesos(e.valueCents), shipping: 0, items: e.items.map((i) => gaItem(i)) }];
    case "contact":
      return ["generate_lead", { method: e.channel, location: e.location }];
  }
}

/** [evento, parámetros, eventID para deduplicar] o null si Meta no tiene equivalente. */
export function toMeta(e: StoreEvent): [string, Record<string, unknown>, string?] | null {
  const contents = (items: TrackItem[]) => items.map((i) => ({ id: i.id, quantity: qty(i) }));
  switch (e.name) {
    case "view_item_list":
      return null;
    case "view_item":
      return ["ViewContent", { content_ids: [e.item.id], content_name: e.item.name, content_type: "product", value: pesos(e.item.priceCents), currency: CURRENCY }];
    case "add_to_cart":
      return ["AddToCart", { content_ids: [e.item.id], content_name: e.item.name, content_type: "product", contents: contents([e.item]), value: pesos(total([e.item])), currency: CURRENCY }];
    case "begin_checkout":
      return ["InitiateCheckout", { content_ids: e.items.map((i) => i.id), contents: contents(e.items), num_items: e.items.reduce((n, i) => n + qty(i), 0), value: pesos(e.valueCents), currency: CURRENCY }];
    case "purchase":
      return ["Purchase", { content_ids: e.items.map((i) => i.id), contents: contents(e.items), content_type: "product", value: pesos(e.valueCents), currency: CURRENCY }, `purchase-${e.orderId}`];
    case "contact":
      return ["Contact", { content_name: e.channel }];
  }
}
