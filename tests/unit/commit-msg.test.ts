import { describe, expect, it } from "vitest";
// @ts-expect-error — script ESM sin tipos, compartido con el hook y el CI
import { validate } from "../../scripts/check-commit-msg.mjs";

describe("Convención gitmoji", () => {
  it.each([
    "✨ (admin): agrega filtro por categoría",
    "🐛 corrige el total del carrito",
    "♻ (catalog): extrae el mapper", // sin selector de variación
    "⬆️ (deps): bump next from 15.5.25 to 15.5.26",
    "Merge branch 'main' into feat/x",
    'Revert "✨ agrega algo"',
  ])("acepta %s", (m) => expect(validate(m).ok).toBe(true));

  it.each([
    "feat: agrega algo",
    "✨agrega algo",
    "✨ (Admin): ámbito en mayúscula",
    "✨ (admin) falta el dos puntos",
    "📝 actualiza la guía.",
    "🤡 emoji fuera de la lista",
    `✨ ${"x".repeat(120)}`,
  ])("rechaza %s", (m) => expect(validate(m).ok).toBe(false));

  it("ignora comentarios y líneas vacías del editor", () => {
    expect(validate("# comentario\n\n🐛 corrige algo\n\ncuerpo").ok).toBe(true);
  });
});
