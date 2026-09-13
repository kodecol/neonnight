import type { Analytics, AnalyticsEvent } from "@/application/ports/analytics";

/** Stub: escribe los eventos del embudo en consola solo en desarrollo. */
export class ConsoleAnalytics implements Analytics {
  constructor(private readonly enabled: boolean = process.env.NODE_ENV !== "production") {}

  track(event: AnalyticsEvent): void {
    if (!this.enabled) return;
    console.info("[analytics]", event.name, event);
  }
}

export class NoopAnalytics implements Analytics {
  track(): void {}
}
