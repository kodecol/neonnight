// Genera las imágenes de los catálogos de demo (src/infrastructure/cms/demo/)
// en public/assets/demo/<nicho>/: una frontal por producto y una portada por
// línea, 1120×1400 WebP. Fondo oscuro neutro con un degradado sutil y una
// silueta geométrica según el tipo (círculo para reloj, anillo u óvalo para
// joya, frasco para perfume), SIN texto ni marcas: sirven para cualquier
// cliente hasta que suba sus fotos.
// Los nombres de archivo salen del id del producto (demo-rj-01.webp) y del slug
// de la línea (portada-relojeria.webp); si cambias los packs, cambia esta tabla.
// Uso: node scripts/generate-demo-images.mjs
import sharp from "sharp";
import { mkdir, rm, stat } from "node:fs/promises";

const OUT = "public/assets/demo";
const W = 1120;
const H = 1400;
const QUALITY = 70;
const MAX_BYTES = 25 * 1024;

/** Por nicho: portadas [slug de la línea, silueta] y productos [prefijo del id, silueta, cantidad]. */
const PACKS = {
  relojeria: { covers: [["relojeria", "reloj"]], items: [["demo-rj", "reloj", 8]] },
  joyeria: { covers: [["joyeria", "joya"]], items: [["demo-jy", "joya", 8]] },
  perfumeria: { covers: [["perfumeria", "perfume"]], items: [["demo-pf", "perfume", 8]] },
  ecommerce: {
    covers: [
      ["relojeria", "reloj"],
      ["joyeria", "joya"],
      ["perfumeria", "perfume"],
    ],
    items: [
      ["demo-ec-rj", "reloj", 4],
      ["demo-ec-jy", "joya", 4],
      ["demo-ec-pf", "perfume", 4],
    ],
  },
};

/** Matices del fondo (h, s %): todos casi grises, para que ninguno compita con la apariencia de la tienda. */
const TINTS = [
  [220, 8],
  [30, 10],
  [200, 6],
  [0, 0],
  [260, 7],
  [40, 8],
  [180, 6],
  [340, 6],
];

const hsl = (h, s, l) => `hsl(${h} ${s}% ${l}%)`;

function defs([h, s], i) {
  return `<defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0" stop-color="${hsl(h, s, 15)}"/>
      <stop offset="0.6" stop-color="${hsl(h, s, 8)}"/>
      <stop offset="1" stop-color="${hsl(h, s, 4)}"/>
    </radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${hsl(h, Math.min(s + 4, 14), 58 - (i % 3) * 6)}"/>
      <stop offset="0.5" stop-color="${hsl(h, s, 34)}"/>
      <stop offset="1" stop-color="${hsl(h, s, 20)}"/>
    </linearGradient>
    <linearGradient id="soft" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${hsl(h, s, 26)}"/>
      <stop offset="1" stop-color="${hsl(h, s, 12)}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${hsl(h, s, 30)}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${hsl(h, s, 30)}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#000" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>`;
}

/** Reloj: caja circular con correa, bisel, esfera y corona. */
function watch(i, scale = 1) {
  const r = (190 + (i % 3) * 18) * scale;
  const strap = (150 + (i % 2) * 30) * scale;
  const cx = W / 2;
  const cy = H * 0.47;
  return `
    <ellipse cx="${cx}" cy="${cy + r + 330 * scale}" rx="${r * 1.1}" ry="${40 * scale}" fill="url(#shadow)"/>
    <rect x="${cx - strap / 2}" y="${cy - r - 330 * scale}" width="${strap}" height="${(r + 330 * scale) * 2}" rx="${36 * scale}" fill="url(#soft)"/>
    <rect x="${cx + r - 4 * scale}" y="${cy - 22 * scale}" width="${38 * scale}" height="${44 * scale}" rx="${8 * scale}" fill="url(#metal)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#metal)"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.84}" fill="url(#soft)"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.06}" fill="url(#metal)"/>`;
}

/** Joya: anillo con piedra (pares) u óvalo colgado de una cadena (impares). */
function jewel(i, scale = 1) {
  const cx = W / 2;
  if (i % 2 === 0) {
    const r = (210 + (i % 3) * 16) * scale;
    const cy = H * 0.55;
    const band = (34 + (i % 4) * 6) * scale;
    return `
      <ellipse cx="${cx}" cy="${cy + r + 90 * scale}" rx="${r * 1.05}" ry="${36 * scale}" fill="url(#shadow)"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#metal)" stroke-width="${band}"/>
      <polygon points="${cx},${cy - r - 120 * scale} ${cx + 62 * scale},${cy - r - 40 * scale} ${cx},${cy - r + 20 * scale} ${cx - 62 * scale},${cy - r - 40 * scale}" fill="url(#soft)" stroke="url(#metal)" stroke-width="${8 * scale}"/>`;
  }
  const rx = (120 + (i % 3) * 14) * scale;
  const ry = rx * 1.4;
  const cy = H * 0.6;
  return `
    <path d="M ${cx - 300 * scale} ${H * 0.12} Q ${cx} ${2 * (cy - ry) - H * 0.12} ${cx + 300 * scale} ${H * 0.12}" fill="none" stroke="url(#metal)" stroke-width="${6 * scale}"/>
    <ellipse cx="${cx}" cy="${cy + ry + 110 * scale}" rx="${rx * 1.2}" ry="${30 * scale}" fill="url(#shadow)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#metal)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.62}" ry="${ry * 0.62}" fill="url(#soft)"/>`;
}

/** Perfume: frasco rectangular con cuello y tapa; las proporciones cambian por pieza. */
function bottle(i, scale = 1) {
  const cx = W / 2;
  const w = (300 + (i % 3) * 70) * scale;
  const h = (400 + ((i + 1) % 3) * 60) * scale;
  const base = H * 0.78;
  const top = base - h;
  const neck = 70 * scale;
  const capW = (120 + (i % 2) * 60) * scale;
  const capH = (110 + (i % 3) * 30) * scale;
  return `
    <ellipse cx="${cx}" cy="${base + 20 * scale}" rx="${w * 0.7}" ry="${34 * scale}" fill="url(#shadow)"/>
    <rect x="${cx - w / 2}" y="${top}" width="${w}" height="${h}" rx="${(18 + (i % 2) * 22) * scale}" fill="url(#soft)" stroke="url(#metal)" stroke-width="${6 * scale}"/>
    <rect x="${cx - w / 2 + 40 * scale}" y="${top + 40 * scale}" width="${w - 80 * scale}" height="${h * 0.55}" rx="${10 * scale}" fill="url(#metal)" opacity="0.22"/>
    <rect x="${cx - 50 * scale}" y="${top - neck}" width="${100 * scale}" height="${neck + 6 * scale}" fill="url(#metal)"/>
    <rect x="${cx - capW / 2}" y="${top - neck - capH}" width="${capW}" height="${capH}" rx="${12 * scale}" fill="url(#metal)"/>`;
}

const SHAPES = { reloj: watch, joya: jewel, perfume: bottle };

function svg(shape, i) {
  const art = SHAPES[shape](i);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs(TINTS[i % TINTS.length], i)}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${art}
  </svg>`;
}

/** Portada de línea: la misma silueta más grande, con un halo que la separa del fondo. */
function coverSvg(shape, i) {
  const art = SHAPES[shape](i, 1.12);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs(TINTS[i % TINTS.length], i)}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="${W / 2}" cy="${H * 0.5}" r="${W * 0.55}" fill="url(#glow)"/>
    ${art}
  </svg>`;
}

async function write(file, markup) {
  await sharp(Buffer.from(markup)).webp({ quality: QUALITY, effort: 6, smartSubsample: true }).toFile(file);
  const { size } = await stat(file);
  if (size > MAX_BYTES) console.warn(`⚠ ${file} pesa ${(size / 1024).toFixed(1)} KB (objetivo < 25 KB)`);
  return size;
}

let total = 0;
let count = 0;
for (const [niche, pack] of Object.entries(PACKS)) {
  const dir = `${OUT}/${niche}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const [k, [line, shape]] of pack.covers.entries()) {
    total += await write(`${dir}/portada-${line}.webp`, coverSvg(shape, k + 3));
    count++;
  }
  for (const [prefix, shape, n] of pack.items) {
    for (let i = 0; i < n; i++) {
      total += await write(`${dir}/${prefix}-${String(i + 1).padStart(2, "0")}.webp`, svg(shape, i));
      count++;
    }
  }
}
console.log(`${count} imágenes en ${OUT}/ · ${(total / 1024).toFixed(1)} KB en total`);
