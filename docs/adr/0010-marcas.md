# ADR 0010 — Marcas administrables

**Fecha:** 2026-10-20 · **Estado:** aceptada · **Amplía:** ADR 0005 y 0008

## Contexto

Las marcas eran el texto libre `Product.brand`, y sus logos estaban fijos en `site-content.ts` (cinco relojeras). Una marca nueva de joyería o perfumería solo podía salir como texto en el marquee, y nada se editaba en el panel.

## Decisión

- **Entidad `Brand`** (colección `brands`, `_id` = slug): nombre, líneas, logo `{src, ratio, mode}`, color de hover, visible en el marquee, orden y descripción. Los productos siguen guardando el nombre en `brand` y se relacionan por nombre normalizado (`brandKey`: sin tildes, mayúsculas ni espacios de más), así no hay migración de productos. Renombrar una marca reescribe la marca de sus productos (`ProductRepository.renameBrand`).
- **Integridad:** el formulario de producto elige la marca de la lista, o la crea al vuelo (`EnsureBrand`), y `SaveProduct` rechaza una marca inexistente y guarda el nombre exacto de la colección. No se puede borrar una marca con productos (`BrandInUseError`).
- **Logos:** SVG o PNG, WebP o AVIF, en Cloudinary (`neonnight/sitio/marcas`) o en disco local. La proporción se calcula sola (viewBox del SVG o dimensiones de la imagen). El SVG se revisa en el servidor (`application/lib/svg.ts`): sin scripts, eventos, `javascript:`, `foreignObject`, entidades ni recursos externos. Además, el sitio lo pinta siempre como máscara CSS o `<img>`, nunca en línea, y `/api/media` lo sirve con una CSP que lo aísla. El modo `silhouette` pinta la forma en blanco (logos de un color); `grayscale` muestra la imagen en grises (logos de varios tonos). Al pasar el cursor, ambos toman el color de marca.
- **Marquee:** solo las marcas visibles con al menos un producto, en el orden del panel. El rótulo y el aviso de revendedor independiente se editan en la misma sección (`settings`, `_id: "brands"`); lo no editado sigue el código.
- **Datos existentes:** `scripts/migrate-brands.mjs` (idempotente) crea las marcas desde los productos y les asigna los logos que trae el sitio. Para bases nuevas, el seed v3 inserta las marcas del seed.

## Consecuencias

- Una marca con productos se renombra, pero no se borra: primero hay que reasignar sus productos.
- El uso de logos oficiales es una decisión legal, no técnica (ver la nota legal del README).
