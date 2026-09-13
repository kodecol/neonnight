import type { Watch } from "../entities/watch";
import type { CartLine } from "../entities/cart-line";
import { Money } from "../value-objects/money";

/**
 * Reglas puras de precio. El total autoritativo siempre se calcula aquí,
 * en el servidor, a partir de las entidades — nunca del importe que llega
 * del cliente.
 */
export function lineTotal(watch: Watch, quantity: number): Money {
  return watch.price.multiply(quantity);
}

export function cartTotal(lines: readonly CartLine[], watchesById: ReadonlyMap<string, Watch>): Money {
  return lines.reduce((acc, line) => {
    const watch = watchesById.get(line.watchId);
    if (!watch) return acc;
    return acc.add(lineTotal(watch, line.quantity));
  }, Money.zero());
}
