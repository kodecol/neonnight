export type AnalyticsEvent =
  | { name: "view_item"; watchId: string; slug: string; priceCents: number }
  | { name: "add_to_cart"; watchId: string; slug: string; priceCents: number }
  | { name: "begin_checkout"; orderId: string; totalCents: number; itemCount: number }
  | { name: "whatsapp_click"; watchId: string | null; slug: string | null };

export interface Analytics {
  track(event: AnalyticsEvent): void | Promise<void>;
}
