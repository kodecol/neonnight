import { describe, expect, it } from "vitest";
import { Money } from "@/domain/value-objects/money";
import { InvalidMoneyError } from "@/domain/errors";

describe("Money", () => {
  it("formatea como el prototipo: $ 12.900.000 COP", () => {
    expect(Money.fromUnits(12_900_000).format()).toBe("$ 12.900.000 COP");
  });

  it("suma y multiplica en centavos enteros", () => {
    const a = Money.fromUnits(100);
    const b = Money.fromCents(50);
    expect(a.add(b).cents).toBe(10_050);
    expect(a.multiply(3).units).toBe(300);
  });

  it("rechaza floats y negativos", () => {
    expect(() => Money.fromCents(1.5)).toThrow(InvalidMoneyError);
    expect(() => Money.fromCents(-1)).toThrow(InvalidMoneyError);
    expect(() => Money.fromUnits(0.1)).toThrow(InvalidMoneyError);
  });

  it("compara", () => {
    expect(Money.fromUnits(10).isLessThanOrEqual(Money.fromUnits(10))).toBe(true);
    expect(Money.fromUnits(11).isLessThanOrEqual(Money.fromUnits(10))).toBe(false);
    expect(Money.fromUnits(1).equals(Money.fromCents(100))).toBe(true);
  });
});
