/** LRU con vencimiento: lo justo para el registro y los contenedores por tenant (sin dependencias). */
export class TtlLru<K, V> {
  private readonly map = new Map<K, { value: V; at: number }>();

  constructor(
    private readonly max: number,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: K): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (this.ttlMs > 0 && this.now() - hit.at > this.ttlMs) {
      this.map.delete(key);
      return undefined;
    }
    // Reinserta: queda como el más reciente.
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }

  set(key: K, value: V): void {
    this.map.delete(key);
    this.map.set(key, { value, at: this.now() });
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value as K);
  }

  delete(key: K): void {
    this.map.delete(key);
  }

  deleteWhere(pred: (value: V, key: K) => boolean): void {
    for (const [k, v] of this.map) if (pred(v.value, k)) this.map.delete(k);
  }

  get size(): number {
    return this.map.size;
  }
}
