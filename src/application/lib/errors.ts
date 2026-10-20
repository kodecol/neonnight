import { DomainError } from "@/domain/errors";

/** Error de validación ligado a un campo concreto del formulario. */
export class FieldValidationError extends DomainError {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(message);
  }
}
