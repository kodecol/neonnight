import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Cada página y route handler del panel verifica la sesión por sí mismo.
 * El layout no basta: una navegación RSC (`RSC: 1` + `Next-Router-State-Tree`)
 * puede renderizar solo el segmento de la página, y el middleware no corre
 * para peticiones con `next-action` (se excluyen para no romper las subidas).
 */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe("Panel: verificación de sesión en cada entrada", () => {
  const entries = files("src/app/admin").filter((f) => /(page|route)\.tsx?$/.test(f) && !f.includes(join("admin", "login")));

  it("hay entradas que revisar", () => expect(entries.length).toBeGreaterThan(15));

  it.each(entries)("%s llama a requireAdmin() o isAdmin()", (f) => {
    expect(readFileSync(f, "utf8")).toMatch(/await (requireAdmin|isAdmin)\(\)/);
  });
});
