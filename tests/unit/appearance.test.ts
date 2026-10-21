import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { contrastRatio } from "@/application/lib/contrast";
import { themeCss } from "@/application/lib/theme-css";
import { DEFAULT_APPEARANCE, PRESETS, PRESET_KEYS, StoreAppearanceSchema, contrastChecks } from "@/application/dto/appearance.dto";
import { ApplyAppearance, GetActiveAppearance, GetAppearanceEditor, SaveAppearance } from "@/application/use-cases/admin/appearance";
import { InMemoryVersionedSettings } from "@/infrastructure/repositories/in-memory-versioned-settings";
import type { StoreAppearance } from "@/application/ports/appearance-settings";
import { SETTINGS_HISTORY_LIMIT } from "@/application/ports/versioned-settings";

function setup() {
  let t = Date.parse("2026-10-21T12:00:00Z");
  const appearance = new InMemoryVersionedSettings<StoreAppearance>();
  return { appearance, deps: { appearance, clock: { now: () => new Date((t += 60_000)) } } };
}

describe("Apariencia: contraste WCAG", () => {
  it("calcula la razón de contraste como WCAG 2.1", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contrastRatio("#ffffff", "#ff006e")).toBeCloseTo(3.83, 2);
  });

  it("todos los presets cumplen AA (texto 4,5:1; texto sobre el acento 3:1)", () => {
    for (const key of PRESET_KEYS) expect(contrastChecks(PRESETS[key].colors).every((c) => c.ok), key).toBe(true);
  });

  it("el servidor rechaza un tema sin contraste suficiente, con su mensaje", () => {
    const res = StoreAppearanceSchema.safeParse({ ...DEFAULT_APPEARANCE, preset: "personalizado", colors: { ...DEFAULT_APPEARANCE.colors, ink2: "#333333" } });
    expect(res.success).toBe(false);
    expect(JSON.stringify(res.error?.issues)).toMatch(/Texto secundario sobre el fondo: contraste 1\.\d+:1, el mínimo es 4\.5:1/);
    const accent = StoreAppearanceSchema.safeParse({ ...DEFAULT_APPEARANCE, colors: { ...DEFAULT_APPEARANCE.colors, accent: "#ffd400" } });
    expect(JSON.stringify(accent.error?.issues)).toContain("Texto sobre el acento");
  });

  it("solo acepta hex y fuentes del catálogo (nada que inyectar en el <style>)", () => {
    expect(StoreAppearanceSchema.safeParse({ ...DEFAULT_APPEARANCE, colors: { ...DEFAULT_APPEARANCE.colors, accent: "red;}body{display:none" } }).success).toBe(false);
    expect(StoreAppearanceSchema.safeParse({ ...DEFAULT_APPEARANCE, fonts: { display: "https://evil.example/font.woff", body: "archivo" } }).success).toBe(false);
  });
});

describe("Apariencia: tema en la tienda", () => {
  it("el CSS del tema sobrescribe los tokens y deriva los secundarios", () => {
    const css = themeCss({ ...DEFAULT_APPEARANCE, colors: { ...PRESETS.zafiro.colors }, fonts: { display: "playfair-display", body: "inter" } });
    expect(css).toMatch(/^:root\{/);
    expect(css).toContain("--color-accent:#2f5bea");
    expect(css).toContain("--color-accent-hover:color-mix(in srgb, #2f5bea 90%, #000)");
    expect(css).toContain("--color-divider:rgb(138 147 168 / 0.3)");
    expect(css).toContain("--font-display:var(--font-playfair-display)");
    expect(css).toContain("--font-sans:var(--font-inter)");
  });

  it("sin nada publicado no hay tema (rige el código); el borrador solo en la vista previa", async () => {
    const { appearance, deps } = setup();
    const active = new GetActiveAppearance(appearance);
    expect(await active.execute()).toBeNull();
    await new SaveAppearance(deps).execute({ ...DEFAULT_APPEARANCE, preset: "zafiro", colors: { ...PRESETS.zafiro.colors } }, "draft");
    expect(await active.execute()).toBeNull();
    expect((await active.execute({ preview: true }))?.preset).toBe("zafiro");

    for (let i = 0; i < SETTINGS_HISTORY_LIMIT + 2; i++) await new ApplyAppearance(deps).execute({ ...DEFAULT_APPEARANCE, preset: i % 2 ? "oro" : "esmeralda", colors: { ...PRESETS[i % 2 ? "oro" : "esmeralda"].colors } });
    const editor = await new GetAppearanceEditor(appearance).execute();
    expect(editor.hasDraft).toBe(false);
    expect(editor.history).toHaveLength(SETTINGS_HISTORY_LIMIT);
    expect((await active.execute())?.preset).toBe("oro");
    await expect(new ApplyAppearance(deps).execute({ ...DEFAULT_APPEARANCE, colors: { ...DEFAULT_APPEARANCE.colors, ink: "#111111" } })).rejects.toBeInstanceOf(ZodError);
  });
});

describe("Apariencia: lectura defensiva", () => {
  it("un documento alterado fuera del panel no llega al <style>: rige globals.css", async () => {
    const { appearance } = setup();
    const tampered = { ...DEFAULT_APPEARANCE, colors: { ...DEFAULT_APPEARANCE.colors, accent: "red}</style><script>alert(1)</script>" }, updatedAt: new Date() };
    await appearance.publish(tampered as unknown as StoreAppearance);
    expect(await new GetActiveAppearance(appearance).execute()).toBeNull();
    await appearance.publish({ ...DEFAULT_APPEARANCE, updatedAt: new Date() } as StoreAppearance);
    expect((await new GetActiveAppearance(appearance).execute())?.colors.accent).toBe(DEFAULT_APPEARANCE.colors.accent);
  });
});
