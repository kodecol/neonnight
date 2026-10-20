"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ProductKind } from "@/domain/entities/product";
import { track } from "@/presentation/analytics/track";

export interface CartItem {
  productId: string;
  variantId: string;
  /** "100 ml", "Talla 17"…; vacío si es variante única. */
  variantLabel: string;
  kind: ProductKind;
  slug: string;
  name: string;
  subtitle: string;
  priceCents: number;
  quantity: number;
  /** Tope de la línea (stock o 1 en piezas únicas). */
  maxQuantity: number;
}

interface CartState {
  items: CartItem[];
  hydrated: boolean;
  isOpen: boolean;
}

interface CartApi extends CartState {
  count: number;
  totalCents: number;
  add: (item: CartItem) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const STORAGE_KEY = "neonnight.cart.v2";
/** Bolsa de la v1 (solo relojes, una unidad por pieza): se migra una vez. */
const LEGACY_KEY = "neonnight.cart.v1";
const CartContext = createContext<CartApi | null>(null);

export const cartKey = (i: Pick<CartItem, "productId" | "variantId">) => `${i.productId}:${i.variantId}`;

const isItem = (i: unknown): i is CartItem =>
  typeof i === "object" && i !== null && typeof (i as CartItem).productId === "string" && typeof (i as CartItem).priceCents === "number" && typeof (i as CartItem).quantity === "number";

function readStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isItem) : [];
    }
    const legacy: unknown = JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? "[]");
    if (!Array.isArray(legacy)) return [];
    // El servidor resuelve la variante única cuando no viene `variantId`.
    return legacy.flatMap((l: { watchId?: unknown; slug?: unknown; name?: unknown; subtitle?: unknown; priceCents?: unknown }) =>
      typeof l?.watchId === "string" && typeof l.priceCents === "number"
        ? [{ productId: l.watchId, variantId: "", variantLabel: "", kind: "reloj" as const, slug: String(l.slug ?? ""), name: String(l.name ?? ""), subtitle: String(l.subtitle ?? ""), priceCents: l.priceCents, quantity: 1, maxQuantity: 1 }]
        : [],
    );
  } catch {
    return [];
  }
}

/**
 * Provider de la bolsa. Persiste en localStorage e hidrata en useEffect para
 * no romper el SSR (el servidor siempre renderiza la bolsa vacía).
 * Los precios aquí son solo informativos: el checkout recalcula en el servidor.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>({ items: [], hydrated: false, isOpen: false });

  useEffect(() => {
    setState((s) => ({ ...s, items: readStorage(), hydrated: true }));
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* almacenamiento no disponible: la bolsa vive solo en memoria */
    }
  }, [state.items, state.hydrated]);

  useEffect(() => {
    if (!state.isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState((s) => ({ ...s, isOpen: false }));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.isOpen]);

  const add = useCallback((item: CartItem) => {
    track({ name: "add_to_cart", item: { id: item.productId, name: item.name, variant: item.variantLabel || undefined, priceCents: item.priceCents, quantity: item.quantity } });
    setState((s) => {
      const key = cartKey(item);
      const prev = s.items.find((i) => cartKey(i) === key);
      // Una línea por variante: sumar respeta el tope (las piezas únicas no se duplican).
      const items = prev
        ? s.items.map((i) => (cartKey(i) === key ? { ...item, quantity: Math.min(item.maxQuantity, i.quantity + item.quantity) } : i))
        : [...s.items, { ...item, quantity: Math.min(item.maxQuantity, item.quantity) }];
      return { ...s, items, isOpen: true };
    });
  }, []);
  const setQuantity = useCallback(
    (key: string, quantity: number) =>
      setState((s) => ({ ...s, items: s.items.map((i) => (cartKey(i) === key ? { ...i, quantity: Math.max(1, Math.min(i.maxQuantity, quantity)) } : i)) })),
    [],
  );
  const remove = useCallback((key: string) => setState((s) => ({ ...s, items: s.items.filter((i) => cartKey(i) !== key) })), []);
  const clear = useCallback(() => setState((s) => ({ ...s, items: [] })), []);
  const open = useCallback(() => setState((s) => ({ ...s, isOpen: true })), []);
  const close = useCallback(() => setState((s) => ({ ...s, isOpen: false })), []);
  const toggle = useCallback(() => setState((s) => ({ ...s, isOpen: !s.isOpen })), []);

  const value = useMemo<CartApi>(
    () => ({
      ...state,
      count: state.items.reduce((n, i) => n + i.quantity, 0),
      totalCents: state.items.reduce((n, i) => n + i.priceCents * i.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      open,
      close,
      toggle,
    }),
    [state, add, setQuantity, remove, clear, open, close, toggle],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>.");
  return ctx;
}
