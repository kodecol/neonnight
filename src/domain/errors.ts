export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class WatchNotFoundError extends DomainError {
  constructor(public readonly slug: string) {
    super(`No existe ningún reloj con slug "${slug}".`);
  }
}

export class WatchUnavailableError extends DomainError {
  constructor(public readonly slug: string) {
    super(`El reloj "${slug}" ya no está disponible.`);
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
    super(`La categoría "${slug}" tiene ${count} reloj(es) asignados. Reasígnalos antes de borrarla.`);
  }
}

export class DuplicateSlugError extends DomainError {
  constructor(public readonly slug: string) {
    super(`Ya existe otro elemento con el slug "${slug}".`);
  }
}
