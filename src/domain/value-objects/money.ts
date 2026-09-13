import { InvalidMoneyError } from "../errors";

export type Currency = "COP";

/**
 * Dinero como entero en centavos. Nunca floats.
 * COP no usa decimales en la práctica, pero mantenemos centavos por
 * consistencia con pasarelas que los exigen (Wompi, Mercado Pago).
 */
export class Money {
  private constructor(
    public readonly cents: number,
    public readonly currency: Currency,
  ) {}

  static fromCents(cents: number, currency: Currency = "COP"): Money {
    if (!Number.isInteger(cents)) throw new InvalidMoneyError(`Centavos no enteros: ${cents}`);
    if (cents < 0) throw new InvalidMoneyError(`Centavos negativos: ${cents}`);
    return new Money(cents, currency);
  }

  /** Desde unidades enteras de la moneda (pesos). */
  static fromUnits(units: number, currency: Currency = "COP"): Money {
    if (!Number.isInteger(units)) throw new InvalidMoneyError(`Unidades no enteras: ${units}`);
    return Money.fromCents(units * 100, currency);
  }

  static zero(currency: Currency = "COP"): Money {
    return new Money(0, currency);
  }

  get units(): number {
    return Math.trunc(this.cents / 100);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  multiply(factor: number): Money {
    if (!Number.isInteger(factor) || factor < 0) throw new InvalidMoneyError(`Factor inválido: ${factor}`);
    return new Money(this.cents * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }

  isLessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents <= other.cents;
  }

  /** Formato del prototipo: `$ 12.900.000 COP`. */
  format(): string {
    const number = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(this.units);
    return `$ ${number} ${this.currency}`;
  }

  toJSON(): { cents: number; currency: Currency } {
    return { cents: this.cents, currency: this.currency };
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new InvalidMoneyError(`Monedas distintas: ${this.currency} vs ${other.currency}`);
    }
  }
}
