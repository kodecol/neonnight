import { describe, expect, it } from "vitest";
import { Slug } from "@/domain/value-objects/slug";
import { InvalidSlugError } from "@/domain/errors";

describe("Slug", () => {
  it("acepta slugs válidos y rechaza inválidos", () => {
    expect(Slug.of("rolex-day-date-36").value).toBe("rolex-day-date-36");
    expect(() => Slug.of("Rolex Day-Date")).toThrow(InvalidSlugError);
    expect(() => Slug.of("-a")).toThrow(InvalidSlugError);
  });
  it("genera desde texto con acentos", () => {
    expect(Slug.fromText("Colección Automáticos 2026").value).toBe("coleccion-automaticos-2026");
  });
});
