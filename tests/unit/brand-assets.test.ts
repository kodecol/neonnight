import { describe, expect, it } from "vitest";
import { encodeIco } from "@/application/lib/ico";
import { GetBrandAssets, shortNameOf, versioned } from "@/application/use-cases/brand-assets";
import { SaveIdentity, GetIdentityEditor } from "@/application/use-cases/admin/identity";
import { SaveAppearance } from "@/application/use-cases/admin/appearance";
import { PRESETS, DEFAULT_APPEARANCE } from "@/application/dto/appearance.dto";
import type { StoreAppearance } from "@/application/ports/appearance-settings";
import { InMemoryIdentitySettingsRepository } from "@/infrastructure/repositories/in-memory-identity-repository";
import { InMemoryVersionedSettings } from "@/infrastructure/repositories/in-memory-versioned-settings";
import { InMemoryHomeSettingsRepository } from "@/infrastructure/repositories/in-memory-site-content-repositories";
import { ManagedSiteContentRepository } from "@/infrastructure/content/managed-site-content-repository";
import { StaticSiteContentRepository } from "@/infrastructure/content/static-site-content-repository";
import { SITE_CONTENT } from "@/infrastructure/content/site-content";

function setup() {
  let t = Date.parse("2026-10-21T12:00:00Z");
  const clock = { now: () => new Date((t += 60_000)) };
  const identity = new InMemoryIdentitySettingsRepository();
  const appearance = new InMemoryVersionedSettings<StoreAppearance>();
  const content = new ManagedSiteContentRepository(new StaticSiteContentRepository(), new InMemoryHomeSettingsRepository(), undefined, identity);
  return { identity, appearance, clock, brand: new GetBrandAssets({ content, identity, appearance }) };
}

const ISOTYPE = { src: "https://res.cloudinary.com/demo/image/upload/v1/neonnight/sitio/identidad/iso.svg", alt: "", ratio: 1 };

describe("Íconos y manifest: GetBrandAssets", () => {
  it("sin nada publicado: íconos de fábrica, sin versión y con los datos del código", async () => {
    const a = await setup().brand.execute();
    expect(a).toMatchObject({ version: "", factoryIcons: true, name: SITE_CONTENT.brand.name, isotype: null, bg: DEFAULT_APPEARANCE.colors.bg });
    expect(a.shortName.length).toBeLessThanOrEqual(12);
  });

  it("publicar Identidad o Apariencia cambia la versión; el isotipo o el fondo nuevos dejan los de fábrica", async () => {
    const { identity, appearance, clock, brand } = setup();
    const factory = (await new GetIdentityEditor(identity).execute(SITE_CONTENT.brand)).factory;

    await new SaveIdentity({ identity, clock }).execute({ ...factory, name: "Casa Prueba" });
    const v1 = await brand.execute();
    expect(v1.version).not.toBe("");
    expect(v1).toMatchObject({ name: "Casa Prueba", factoryIcons: true });

    await new SaveAppearance({ appearance, clock }).execute({ ...DEFAULT_APPEARANCE, preset: "zafiro", colors: PRESETS.zafiro.colors });
    const v2 = await brand.execute();
    expect(v2.version).not.toBe(v1.version);
    expect(v2).toMatchObject({ bg: PRESETS.zafiro.colors.bg, factoryIcons: false });

    await new SaveAppearance({ appearance, clock }).execute(DEFAULT_APPEARANCE);
    await new SaveIdentity({ identity, clock }).execute({ ...factory, isotype: ISOTYPE });
    const v3 = await brand.execute();
    expect(v3).toMatchObject({ isotype: ISOTYPE, factoryIcons: false });
    expect(v3.version).not.toBe(v2.version);
  });

  it("los borradores no cambian lo que sirven los íconos", async () => {
    const { appearance, clock, brand } = setup();
    await new SaveAppearance({ appearance, clock }).execute({ ...DEFAULT_APPEARANCE, preset: "oro", colors: PRESETS.oro.colors }, "draft");
    expect(await brand.execute()).toMatchObject({ version: "", factoryIcons: true });
  });

  it("nombre corto: el nombre si cabe en 12, si no el wordmark, si no la primera palabra", () => {
    expect(shortNameOf("Neon Night", "NEON NIGHT")).toBe("Neon Night");
    expect(shortNameOf("Relojería del Centro", "RDC")).toBe("RDC");
    expect(shortNameOf("Relojería del Centro", "RELOJERÍA DEL CENTRO")).toBe("Relojería");
    expect(shortNameOf("Extraordinariamente Largo", "EXTRAORDINARIAMENTE")).toBe("Extraordinar");
  });

  it("versioned agrega ?v= o &v= solo si hay versión", () => {
    expect(versioned("/favicon.ico", "")).toBe("/favicon.ico");
    expect(versioned("/favicon.ico", "abc")).toBe("/favicon.ico?v=abc");
    expect(versioned("/og?linea=relojes", "abc")).toBe("/og?linea=relojes&v=abc");
  });
});

describe("Favicon: encodeIco", () => {
  it("arma la cabecera y las entradas con los PNG en orden", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5]);
    const ico = encodeIco([
      { size: 16, png: a },
      { size: 256, png: b },
    ]);
    const v = new DataView(ico.buffer);
    expect([v.getUint16(0, true), v.getUint16(2, true), v.getUint16(4, true)]).toEqual([0, 1, 2]);
    // Primera entrada: 16 × 16, 32 bpp, 3 bytes en el desplazamiento 38 (6 + 2 × 16).
    expect([ico[6], ico[7], v.getUint16(12, true), v.getUint32(14, true), v.getUint32(18, true)]).toEqual([16, 16, 32, 3, 38]);
    // 256 px se escribe como 0.
    expect([ico[22], ico[23], v.getUint32(30, true), v.getUint32(34, true)]).toEqual([0, 0, 2, 41]);
    expect([...ico.slice(38)]).toEqual([1, 2, 3, 4, 5]);
  });
});
