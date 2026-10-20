// Genera favicon.ico (16/32/48), icon.png (512) y apple-icon.png (180) en src/app/
// a partir del isotipo oficial (public/assets/isotipo-color.png): placa negra,
// trazos en blanco y el "&" en magenta. En tamaños chicos engrosa los trazos
// (dilatación sobre una versión 4× más grande) para que el isotipo se lea.
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const SRC = "public/assets/isotipo-color.png";
const OUT = "src/app";
const BG = { r: 0, g: 0, b: 0, alpha: 1 };

/** Trazos negros → blancos; el magenta se conserva. */
async function recolored() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, g] = [data[i], data[i + 1]];
    const magenta = r > 150 && g < 110;
    if (data[i + 3] > 0 && !magenta) data[i] = data[i + 1] = data[i + 2] = 255;
  }
  return sharp(data, { raw: info }).png().trim().toBuffer();
}

/** Dilatación (filtro de máximo) del alfa, conservando el color del vecino más opaco. */
function dilate(data, w, h, radius) {
  if (radius <= 0) return data;
  const out = Buffer.from(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = -1;
      let bi = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w || dx * dx + dy * dy > radius * radius) continue;
          const j = (yy * w + xx) * 4;
          if (data[j + 3] > best) {
            best = data[j + 3];
            bi = j;
          }
        }
      }
      const o = (y * w + x) * 4;
      out[o] = data[bi];
      out[o + 1] = data[bi + 1];
      out[o + 2] = data[bi + 2];
      out[o + 3] = best;
    }
  }
  return out;
}

async function icon(art, size, { fill = 0.8, thicken = 0 } = {}) {
  const S = size * 4;
  const box = Math.round(S * fill);
  const { data, info } = await sharp(art).resize(box, box, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const thick = dilate(data, info.width, info.height, thicken);
  const layer = await sharp(thick, { raw: info }).png().toBuffer();
  const big = await sharp({ create: { width: S, height: S, channels: 4, background: BG } })
    .composite([{ input: layer, gravity: "center" }])
    .png()
    .toBuffer();
  return sharp(big).resize(size, size, { kernel: "lanczos3" }).png().toBuffer();
}

/** ICO con entradas PNG (soportado por todos los navegadores actuales). */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, buf }, i) => {
    const e = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, e);
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1);
    dir.writeUInt8(0, e + 2);
    dir.writeUInt8(0, e + 3);
    dir.writeUInt16LE(1, e + 4);
    dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(buf.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.buf)]);
}

const art = await recolored();
const small = await Promise.all(
  [
    [16, 2],
    [32, 3],
    [48, 3],
  ].map(async ([size, thicken]) => ({ size, buf: await icon(art, size, { fill: 0.86, thicken }) })),
);
await writeFile(`${OUT}/favicon.ico`, ico(small));
await writeFile(`${OUT}/icon.png`, await icon(art, 512, { fill: 0.74, thicken: 6 }));
await writeFile(`${OUT}/apple-icon.png`, await icon(art, 180, { fill: 0.72, thicken: 4 }));
console.log("Iconos generados en", OUT);
