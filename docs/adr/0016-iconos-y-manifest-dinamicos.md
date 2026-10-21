# ADR 0016 — Marca blanca, fase 4: favicon, íconos y manifest dinámicos

**Fecha:** 2026-10-21 · **Estado:** aceptada · **Amplía:** ADR 0013 y 0015

## Contexto

El favicon, el ícono de la pantalla de inicio y el de Apple eran archivos fijos en `src/app` (`favicon.ico`, `icon.png`, `apple-icon.png`) con el isotipo de Neon Night sobre negro, y no había manifest. Con Identidad y Apariencia editables, una tienda con otro isotipo u otro fondo seguía mostrando el ícono de Neon Night en la pestaña y al instalarla en el celular. Las vistas previas al compartir (OG) ya usaban el nombre, el isotipo y los colores vigentes, pero con URLs fijas: Facebook, WhatsApp y los proxies seguían sirviendo la imagen anterior hasta un día después.

## Decisión

- **`GetBrandAssets`** (`application/use-cases/brand-assets.ts`) reúne lo que necesitan íconos, manifest y vistas previas: nombre, nombre corto (12 caracteres como mucho), descripción, isotipo de Identidad, fondo de Apariencia y una **versión**. La versión es la hora de la última publicación de Identidad o Apariencia (en base 36), y vacía si no hay nada publicado. Los borradores no cuentan.
- **Íconos dibujados en el servidor** con `sharp` (`app/_icons/render.ts`): el isotipo de Identidad (Cloudinary lo entrega en PNG aunque sea SVG; en local se lee del disco) se centra sobre el fondo de Apariencia.
  - `/favicon.ico`: un `.ico` con PNG de 16, 32 y 48 px (`application/lib/ico.ts`).
  - `/icons/icon-192.png` e `/icons/icon-512.png`: propósito `any`, con el isotipo al 74 %.
  - `/icons/maskable-512.png`: el isotipo al 56 %, dentro de la zona segura de Android.
  - `/icons/apple-touch-icon.png`: 180 px, opaco.
  Si el isotipo no se puede leer, se usa el del sitio.
- **Fallback de fábrica:** sin isotipo propio y con el fondo de fábrica se sirven tal cual los archivos de siempre, ahora en `public/assets/icons/`. Producción no cambia hasta que se publique un isotipo o un fondo distinto.
- **`/manifest.webmanifest`** (route handler): `name` y `short_name` de Identidad; `background_color` y `theme_color` del fondo de Apariencia (el mismo de `<meta name="theme-color">`); `display: standalone` y los tres íconos.
- **Caché, versionada por publicación:**
  - El layout raíz enlaza íconos, manifest y la vista previa general con `?v=<versión>`, y las páginas hacen lo mismo con sus vistas previas.
  - Al publicar, el panel ya revalida el layout (`revalidatePath("/", "layout")`), así que las páginas enlazan las URLs nuevas en ese momento. Navegadores y redes sociales piden entonces el archivo nuevo, sin esperar a que venza ninguna caché.
  - Con la versión vigente en la URL, íconos y manifest se sirven `immutable` por un año. Sin versión (`/favicon.ico` pedido directo) o con una vieja, se sirven por una hora.
  - En el servidor, cada ícono se dibuja una vez por versión y queda en memoria.

## Consecuencias

- Un ícono nuevo se agrega en `ICON_FILES` (`app/_icons/render.ts`) y, si va en el manifest, en `manifest.webmanifest/route.ts`.
- Los archivos de `public/assets/icons/` son el ícono de fábrica: si cambia la marca de fábrica, se reemplazan ahí.
- Las redes sociales que ya guardaron una vista previa de un enlace no la cambian solas: muestran la nueva cuando vuelven a leer la página, que ahora apunta a otra URL de imagen.
