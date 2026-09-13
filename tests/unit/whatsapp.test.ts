import { describe, expect, it } from "vitest";
import { WaMeLinkBuilder } from "@/infrastructure/whatsapp/wa-me-link-builder";

describe("WaMeLinkBuilder", () => {
  it("devuelve null sin número configurado", () => {
    const b = new WaMeLinkBuilder("");
    expect(b.isConfigured()).toBe(false);
    expect(b.forWatch({ name: "X", reference: "1", canonicalUrl: "https://a.b/c" })).toBeNull();
  });

  it("construye el deep link con modelo, referencia y URL canónica", () => {
    const b = new WaMeLinkBuilder("+57 300 123 4567");
    const url = b.forWatch({ name: "Rolex Day-Date 36", reference: "128238", canonicalUrl: "https://neonnight.co/reloj/rolex-day-date-36" });
    expect(url).toMatch(/^https:\/\/wa\.me\/573001234567\?text=/);
    expect(decodeURIComponent(url!.split("text=")[1]!)).toBe(
      "Hola, me interesa el Rolex Day-Date 36 (ref. 128238). https://neonnight.co/reloj/rolex-day-date-36",
    );
  });
});
