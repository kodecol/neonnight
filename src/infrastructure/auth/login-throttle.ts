import type { LoginThrottle } from "@/application/ports/admin-credentials";

/**
 * Ventana deslizante en memoria: `max` fallos por clave dentro de `windowMs`.
 * Un solo proceso por instalación, así que no hace falta Redis. Se reinicia con
 * el contenedor, lo que está bien: el objetivo es frenar, no auditar.
 */
export class InMemoryLoginThrottle implements LoginThrottle {
  private readonly fails = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  private recent(key: string, nowMs: number): number[] {
    const list = (this.fails.get(key) ?? []).filter((t) => nowMs - t < this.windowMs);
    if (list.length) this.fails.set(key, list);
    else this.fails.delete(key);
    return list;
  }

  retryAfter(key: string, nowMs: number): number {
    const list = this.recent(key, nowMs);
    if (list.length < this.max) return 0;
    return Math.max(1, Math.ceil((list[0]! + this.windowMs - nowMs) / 1000));
  }

  fail(key: string, nowMs: number): void {
    this.fails.set(key, [...this.recent(key, nowMs), nowMs]);
  }

  reset(key: string): void {
    this.fails.delete(key);
  }
}

/** Por IP: 5 fallos en 15 min. Global: 50 en 15 min (ataque repartido entre IPs). */
export function createLoginThrottles(): { perIp: LoginThrottle; global: LoginThrottle } {
  return { perIp: new InMemoryLoginThrottle(5, 15 * 60_000), global: new InMemoryLoginThrottle(50, 15 * 60_000) };
}
