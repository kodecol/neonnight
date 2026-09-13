import { InvalidSlugError } from "../errors";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class Slug {
  private constructor(public readonly value: string) {}

  static of(value: string): Slug {
    if (!SLUG_RE.test(value)) throw new InvalidSlugError(`Slug inválido: "${value}"`);
    return new Slug(value);
  }

  static isValid(value: string): boolean {
    return SLUG_RE.test(value);
  }

  /** Genera un slug desde texto libre (minúsculas, sin acentos, guiones). */
  static fromText(text: string): Slug {
    const value = text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return Slug.of(value);
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
