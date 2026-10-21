export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ProductNotFoundError extends DomainError {
  constructor(public readonly slug: string) {
    super(`No existe ningún producto con slug "${slug}".`);
  }
}

export class ProductUnavailableError extends DomainError {
  constructor(public readonly slug: string, detail = "ya no está disponible") {
    super(`"${slug}" ${detail}.`);
  }
}

export class LineNotFoundError extends DomainError {
  constructor(public readonly slug: string) {
    super(`No existe la línea "${slug}".`);
  }
}

export class InvalidMoneyError extends DomainError {}
export class InvalidSlugError extends DomainError {}
export class EmptyCartError extends DomainError {
  constructor() {
    super("La bolsa está vacía.");
  }
}

export class CategoryInUseError extends DomainError {
  constructor(public readonly slug: string, public readonly count: number) {
    super(`La categoría "${slug}" tiene ${count} producto(s) asignados. Reasígnalos antes de borrarla.`);
  }
}

export class LineInUseError extends DomainError {
  constructor(public readonly slug: string, what: string) {
    super(`La línea "${slug}" todavía tiene ${what}. Muévelos o elimínalos antes de borrarla.`);
  }
}

export class DuplicateSlugError extends DomainError {
  constructor(public readonly slug: string) {
    super(`Ya existe otro elemento con el slug "${slug}".`);
  }
}

export class MediaInUseError extends DomainError {
  constructor(public readonly id: string, public readonly where: readonly string[]) {
    super(`Esta foto se usa en: ${where.join(", ")}. Cámbiala allí antes de quitarla.`);
  }
}

export class PaymentsUnavailableError extends DomainError {
  constructor() {
    super("Por ahora no recibimos pagos en línea. Escríbenos por WhatsApp y cerramos la compra contigo.");
  }
}
