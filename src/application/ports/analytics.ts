export type AnalyticsEvent =
  | { name: "view_item"; productId: string; slug: string; priceCents: number }
  | { name: "add_to_cart"; productId: string; slug: string; priceCents: number }
  | { name: "begin_checkout"; orderId: string; totalCents: number; itemCount: number }
  | { name: "whatsapp_click"; productId: string | null; slug: string | null };

export interface Analytics {
  track(event: AnalyticsEvent): void | Promise<void>;
}
