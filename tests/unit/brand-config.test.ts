import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { BrandConfigSchema, brandAppearance, brandColors, brandCompany } from "@/application/dto/brand-config.dto";
import { PRESETS, StoreAppearanceSchema, contrastChecks } from "@/application/dto/appearance.dto";
import { ApplyBrandConfig } from "@/application/use-cases/admin/brand-config";
import { TEMPLATE } from "@/application/lib/template-info";
import { SCHEMA_VERSION } from "@/infrastructure/mongo/migrations";
import { createContainer } from "@/infrastructure/container";
import { InMemoryBrandFingerprint } from "@/infrastructure/brand/brand-fingerprint";

const example = JSON.parse(readFileSync("examples/brand.example.json", "utf8"));
const manifest = JSON.parse(readFileSync("template.manifest.json", "utf8"));
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

describe("Plantilla jewelry-store: contrato con Kodecol", () => {
  it("versión y esquema coinciden en package.json, manifiesto, código y health", () => {
    expect(manifest.name).toBe(TEMPLATE.name);
    expect(manifest.version).toBe(TEMPLATE.version);
    expect(pkg.version).toBe(TEMPLATE.version);
    expect(manifest.schema_version).toBe(SCHEMA_VERSION);
  });

  it("brand.schema.json está al día con BrandConfigSchema", () => {
    expect(() => execFileSync("node", ["scripts/generate-brand-schema.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  });

  it("el ejemplo es válido, de una marca ficticia, y su paleta derivada cumple AA", () => {
    const brand = BrandConfigSchema.parse(example);
    expect(JSON.stringify(example).toLowerCase()).not.toContain("neon");
    expect(() => StoreAppearanceSchema.parse(brandAppearance(brand))).not.toThrow();
    expect(contrastChecks(brandColors(brand.colors)).every((c) => c.ok)).toBe(true);
  });

  it("rechaza slugs, colores, fondos claros, fuentes y redes inválidas", () => {
    const bad = (patch: Record<string, unknown>) => BrandConfigSchema.safeParse({ ...example, ...patch }).success;
    expect(bad({ slug: "Aurora" })).toBe(false);
    expect(bad({ colors: { accent: "red", background: "#000000" } })).toBe(false);
    expect(bad({ colors: { accent: "#9a6f12", background: "#ffffff" } })).toBe(false);
    expect(bad({ font: "comic-sans" })).toBe(false);
    expect(bad({ social: { instagram: "https://evil.example/aurora" } })).toBe(false);
    expect(bad({ isotipo_url: "http://inseguro.example/iso.png" })).toBe(false);
    expect(bad({ isotipo_url: "/assets/../../etc/passwd" })).toBe(false);
  });

  it("el brand pack de Neon Night es válido y reproduce su apariencia de fábrica", () => {
    const nn = BrandConfigSchema.parse(JSON.parse(readFileSync("brands/neonnight/brand.json", "utf8")));
    expect(brandColors(nn.colors)).toEqual(PRESETS["neon-night"].colors);
    expect(() => StoreAppearanceSchema.parse(brandAppearance(nn))).not.toThrow();
  });

  it("deriva empresa con valores razonables", () => {
    const c = brandCompany(BrandConfigSchema.parse(example));
    expect(c).toMatchObject({ tradeName: "Aurora Joyería S.A.S.", registryNumber: "901234567-8", chamber: "Cámara de Comercio de Medellín", privacyEmail: "hola@aurora-joyeria.example" });
  });
});

describe("brand:apply", () => {
  function setup() {
    const c = createContainer();
    const fingerprint = new InMemoryBrandFingerprint();
    const resolved: string[] = [];
    const apply = new ApplyBrandConfig({
      identity: c.identity,
      appearance: c.appearance,
      companySettings: c.companySettings,
      homeSettings: c.homeSettings,
      fingerprint,
      clock: c.clock,
      resolveAsset: async (ref, alt) => (resolved.push(ref), { src: "/api/media/marca.png", alt, ratio: 1 }),
    });
    return { c, apply, resolved };
  }

  it("publica identidad, apariencia, empresa y redes; el mismo archivo no vuelve a publicar", async () => {
    const { c, apply, resolved } = setup();
    const brand = { ...example, isotipo_url: "https://cdn.example/iso.png" };
    expect(await apply.execute(brand)).toMatchObject({ status: "aplicada", applied: ["identidad", "apariencia", "empresa", "redes"] });
    expect((await c.identity.get())?.name).toBe("Aurora Joyería");
    expect((await c.identity.get())?.isotype?.src).toBe("/api/media/marca.png");
    expect((await c.appearance.get())?.fonts).toEqual({ display: "cormorant-garamond", body: "manrope" });
    expect((await c.companySettings.get())?.city).toBe("Medellín");
    const ig = (await c.homeSettings.get()).social?.networks.find((n) => n.id === "instagram");
    expect(ig).toMatchObject({ enabled: true, handle: "@aurora.joyeria.demo" });
    expect(await apply.execute(brand)).toMatchObject({ status: "sin-cambios" });
    expect(resolved).toHaveLength(1);
    expect(await apply.execute(brand, { force: true })).toMatchObject({ status: "aplicada" });
  });

  it("si el contraste no alcanza, falla sin publicar nada", async () => {
    const { c, apply } = setup();
    await expect(apply.execute({ ...example, colors: { accent: "#f5d90a", background: "#0a0805" } })).rejects.toBeInstanceOf(ZodError);
    expect(await c.identity.get()).toBeNull();
    expect(await c.appearance.get()).toBeNull();
  });
});

describe("Prefijo del número de pedido", () => {
  it("sale de STORE_ORDER_PREFIX o de las iniciales del slug", async () => {
    const { singleInstanceConfig, prefixFor } = await import("@/infrastructure/config/instance");
    const { newOrderId } = await import("@/domain/entities/order");
    expect(singleInstanceConfig({ STORE_SLUG: "aurora-joyeria" }).orderPrefix).toBe("AJ");
    expect(singleInstanceConfig({ STORE_SLUG: "aurora-joyeria", STORE_ORDER_PREFIX: "nn" }).orderPrefix).toBe("NN");
    expect(prefixFor("tienda")).toBe("T");
    expect(newOrderId(new Date("2026-10-21T12:00:00Z"), "abc12", "AJ")).toBe("AJ-261021-ABC12");
  });
});
