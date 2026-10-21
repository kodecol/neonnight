/**
 * Arma un .ico con imágenes PNG adentro (válido desde Windows Vista y en
 * todos los navegadores actuales): cabecera de 6 bytes, una entrada de 16 por
 * imagen y luego los PNG tal cual.
 */
export function encodeIco(images: ReadonlyArray<{ size: number; png: Uint8Array }>): Uint8Array {
  const HEADER = 6;
  const ENTRY = 16;
  const total = HEADER + ENTRY * images.length + images.reduce((n, i) => n + i.png.byteLength, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true); // reservado
  view.setUint16(2, 1, true); // 1 = ícono
  view.setUint16(4, images.length, true);
  let offset = HEADER + ENTRY * images.length;
  images.forEach(({ size, png }, i) => {
    const at = HEADER + ENTRY * i;
    // 0 significa 256 px.
    view.setUint8(at, size >= 256 ? 0 : size);
    view.setUint8(at + 1, size >= 256 ? 0 : size);
    view.setUint8(at + 2, 0); // sin paleta
    view.setUint8(at + 3, 0);
    view.setUint16(at + 4, 1, true); // planos
    view.setUint16(at + 6, 32, true); // bits por píxel
    view.setUint32(at + 8, png.byteLength, true);
    view.setUint32(at + 12, offset, true);
    out.set(png, offset);
    offset += png.byteLength;
  });
  return out;
}
