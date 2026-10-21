# ADR 0015 — Marca blanca, fases 2 y 3: colores y tipografía editables

**Fecha:** 2026-10-21 · **Estado:** aceptada · **Amplía:** ADR 0002 y 0013

## Contexto

Los colores vivían como tokens de Tailwind en `globals.css`, con algunos hex fijos repartidos en componentes, y la tipografía era Archivo cargada con `next/font`. Para la marca blanca, la tienda tiene que poder cambiar de colores y de fuentes desde el panel sin recompilar y sin perder el contraste.

## Decisión

- **Contrato:** `StoreAppearanceSchema` (`application/dto/appearance.dto.ts`) con preset, colores y fuentes de títulos y cuerpo. Es parte del futuro `brand.config.json`, junto a `StoreIdentitySchema`. `ApplyAppearance` es su `brand:apply`.
- **Colores:** se editan solo los tokens semánticos (acento, fondo, superficie, texto 1/2/3, líneas, bordes) como hex. Lo demás se deriva: superficie elevada, vidrio y velo con el fondo; hover y presionado del acento con `color-mix`; líneas y bordes con su transparencia. Hay cuatro presets (Neon Night, el de fábrica, más Zafiro, Esmeralda y Oro) y la opción "personalizado". Por ahora solo tema oscuro.
- **Contraste WCAG AA validado en el servidor**, y visible en vivo en el editor:
  - texto y texto secundario sobre el fondo, y texto sobre las superficies: 4,5:1;
  - texto sobre el acento (botones en mayúsculas y negrita): 3:1, el mínimo AA para texto grande y componentes. El blanco sobre el magenta de fábrica da 3,83:1.
  Un tema que no cumple se rechaza con el detalle.
- **Aplicación en runtime:** el layout raíz pinta un `<style>` que sobrescribe las variables CSS en `:root` y fija `themeColor` desde el fondo. Sin nada publicado no se pinta nada y rige `globals.css`, así que producción no cambia. Los valores se validan antes (hex y claves de catálogo), por lo que no hay inyección posible.
- **Sin hex fijos en componentes:** el hover del botón, las casillas, los degradados del hero, la ficha, las líneas y los testimonios, y las imágenes de vista previa pasan por los tokens.
- **Tipografía:** catálogo cerrado de 8 fuentes de Google cargadas con `next/font` (Archivo, Inter, Manrope, DM Sans, Space Grotesk, Montserrat, Playfair Display y Cormorant Garamond), cada una con su variable CSS en `<html>`. Solo se precarga Archivo; el navegador descarga solo la que usa el tema. Títulos (h1–h3, `--font-display`) y cuerpo (`--font-sans`) van por separado. No se aceptan URLs de fuentes.
- **Persistencia:** `settings` con `_id: "appearance"`, que guarda publicado, borrador e historial (10), mediante el repositorio genérico `MongoVersionedSettings`. El panel está en Ajustes › Apariencia, con vista previa en `/admin/vista-previa/apariencia`.

## Fuera de esta fase

Tema claro y favicon y manifest dinámicos (fase 4).

## Consecuencias

- Un color nuevo en un componente debe usar un token (o `color-mix` de un token), nunca un hex.
- `bg-black/40` (banda parallax y vista de la banda en Inicio) no genera CSS porque la paleta de Tailwind se reinicia en `@theme`. Se deja igual para no cambiar producción; si se quiere ese velo, se usa `bg-bg/40`.
