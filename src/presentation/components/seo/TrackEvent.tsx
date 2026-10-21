"use client";
import { useEffect } from "react";
import type { StoreEvent } from "@/presentation/analytics/events";
import { track } from "@/presentation/analytics/track";
import { storeKey } from "@/presentation/lib/store-key";

const SENT_KEY = () => storeKey("tracked-orders");

/** Registra un evento al montar la página (vista de producto o de lista). */
export function TrackEvent({ event }: { event: StoreEvent }) {
  const key = JSON.stringify(event);
  useEffect(() => {
    track(JSON.parse(key) as StoreEvent);
  }, [key]);
  return null;
}

/** Compra confirmada: se registra una sola vez por pedido aunque se recargue /gracias. */
export function TrackPurchase({ event }: { event: Extract<StoreEvent, { name: "purchase" }> }) {
  const key = JSON.stringify(event);
  useEffect(() => {
    const e = JSON.parse(key) as typeof event;
    let sent: string[] = [];
    try {
      const raw: unknown = JSON.parse(window.localStorage.getItem(SENT_KEY()) ?? "[]");
      sent = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
    } catch {
      /* sin almacenamiento: se registra igual */
    }
    if (sent.includes(e.orderId)) return;
    track(e);
    try {
      window.localStorage.setItem(SENT_KEY(), JSON.stringify([...sent, e.orderId].slice(-20)));
    } catch {
      /* nada que hacer */
    }
  }, [key]);
  return null;
}
