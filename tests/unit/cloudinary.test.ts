import { describe, expect, it } from "vitest";
import { cloudinaryUrl, isCloudinary } from "@/presentation/lib/cloudinary";

describe("Entrega desde Cloudinary", () => {
  const img = "https://res.cloudinary.com/demo/image/upload/v1/neonnight/catalogo/products/creed-aventus-front.webp";

  it("detecta solo URLs de Cloudinary", () => {
    expect(isCloudinary(img)).toBe(true);
    expect(isCloudinary("/assets/products/creed-aventus-front.webp")).toBe(false);
    expect(isCloudinary("https://evil.example/res.cloudinary.com/x.png")).toBe(false);
  });

  it("pide formato y calidad automáticos al ancho del layout", () => {
    expect(cloudinaryUrl(img, 640)).toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v1/neonnight/catalogo/products/creed-aventus-front.webp");
    expect(cloudinaryUrl(img, 640, 75)).toContain("/upload/f_auto,q_75,c_limit,w_640/");
  });

  it("también transforma videos", () => {
    expect(cloudinaryUrl("https://res.cloudinary.com/demo/video/upload/v1/neonnight/catalogo/hero.mp4", 1920)).toBe(
      "https://res.cloudinary.com/demo/video/upload/f_auto,q_auto,c_limit,w_1920/v1/neonnight/catalogo/hero.mp4",
    );
  });
});
