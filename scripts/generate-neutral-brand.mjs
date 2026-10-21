// Genera la marca NEUTRA de la plantilla (la que se ve mientras la tienda no
// publica su isotipo en Ajustes › Identidad): un rombo geométrico, sin texto.
// Escribe public/assets/isotipo-{dark,mono,color}.png y los íconos de fábrica
// public/assets/icons/{favicon.ico,icon-512.png,apple-touch-icon.png}.
// Los de Neon Night viven en public/assets/brands/neonnight/ (su brand pack).
// Uso: node scripts/generate-neutral-brand.mjs
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

/** Rombo con contorno y núcleo: se lee a 16 px y no se parece a ninguna marca. */
function markSvg(w, h, color, pad = 0.06) {
  const cx = w / 2;
  const cy = h / 2;
  const r = (Math.min(w, h) / 2) * (1 - pad);
  const stroke = r * 0.13;
  const inner = r * 0.34;
  const d = (k) => `M ${cx} ${cy - k} L ${cx + k} ${cy} L ${cx} ${cy + k} L ${cx - k} ${cy} Z`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<path d="${d(r - stroke / 2)}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linejoin="miter"/>` +
      `<path d="${d(inner)}" fill="${color}"/></svg>`,
  );
}

const png = (svg) => sharp(svg).png({ compressionLevel: 9 }).toBuffer();

/** Ícono cuadrado: fondo negro y el rombo al `fill` del lado. */
async function icon(size, fill) {
  const art = await png(markSvg(Math.round(size * fill), Math.round(size * fill), "#ffffff", 0));
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
    .composite([{ input: art, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** .ico con PNG embebidos (16, 32 y 48 px). */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

// Mismas medidas que los archivos que reemplazan (el código asume 656 × 677 para el oscuro).
await writeFile("public/assets/isotipo-dark.png", await png(markSvg(656, 677, "#ffffff")));
await writeFile("public/assets/isotipo-color.png", await png(markSvg(807, 778, "#ffffff")));
await writeFile("public/assets/isotipo-mono.png", await png(markSvg(807, 778, "#000000")));
await writeFile("public/assets/icons/icon-512.png", await icon(512, 0.62));
await writeFile("public/assets/icons/apple-touch-icon.png", await icon(180, 0.62));
await writeFile("public/assets/icons/favicon.ico", ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await icon(size, 0.86) })))));
console.log("Marca neutra generada.");
