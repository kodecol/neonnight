/** Referencia de fabricante (p. ej. "128238"). Cadena opaca normalizada. */
export class Reference {
  private constructor(public readonly value: string) {}

  static of(value: string): Reference {
    return new Reference(value.trim().toUpperCase());
  }

  equals(other: Reference): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
