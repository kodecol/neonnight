# ADR 0011 — Filtros dinámicos del catálogo

**Fecha:** 2026-10-20 · **Estado:** aceptada · **Amplía:** ADR 0005

## Contexto

Las facetas ya salían de los productos para marca, género o concentración, pero los tramos de precio estaban fijos por plantilla (reloj 20, 60 y 150 millones; perfume 800 mil y 1,5 millones…), el tamaño de caja tenía cortes fijos y el material o el metal se adivinaban por palabras clave del texto libre. Al crear, editar o vender piezas, los filtros podían ofrecer tramos vacíos o no reflejar el catálogo.

## Decisión

- **Precio como rango, no como faceta.** `?precio=` lleva un rango cerrado (`20000000-60000000`, `hasta-…`, `desde-…`; los valores de los tramos de antes siguen funcionando). El panel muestra el rango real de la vista (con el resto de filtros aplicados), **tramos sugeridos** por cuantiles redondeados a cifras "bonitas" y dos campos desde/hasta en un formulario GET (funciona sin JS; `?precio_min=&precio_max=` se normaliza). Los tramos no se pisan (`(c1, c2]` se guarda como `[c1+1, c2]`), nunca quedan vacíos y no aparecen con 0–1 precio distinto. Se usa el precio "desde" de las variantes.
- **Numéricos desde los datos:** tamaño de caja y mililitros muestran cada valor real como opción (hasta 8 distintos) o tramos por cuantiles si hay más.
- **Material estructurado:** `WatchSpecs.caseMaterialKey` y `JewelrySpecs.metalKey` (listas canónicas en `domain/services/materials.ts`) se eligen en el panel; el texto de la ficha sigue siendo lo que se muestra. Mientras no se elija a mano, la clave sigue al texto. Los datos sin clave usan la deducción por texto como respaldo; `scripts/migrate-spec-materials.mjs` (idempotente, `--dry-run`) la guarda en la base.
- **Facetas:** opciones con conteo disyuntivo; las de 0 resultados se ocultan y las facetas con una sola opción no se muestran (salvo el interruptor de disponibilidad).
- **Marcas:** `BrowseCatalog` acepta un `BrandDirectory` opcional (`list()` con nombre y orden); con él, la faceta usa el nombre y el orden del catálogo de marcas. Sin él, el texto de los productos.
- **Sin caché:** todo se calcula por petición en memoria (`application/lib/ranges.ts` y `facets.ts`, funciones puras). Si el catálogo crece, el mismo cálculo se lleva a una agregación de Mongo (`$bucketAuto`, `$facet`) sin cambiar la interfaz.
- **Móvil:** el panel tiene un pie fijo con "Limpiar" y "Ver N piezas" (cierra el panel).

## Consecuencias

- Los productos nuevos exigen elegir el material o el metal canónico (validación del panel).
- Al integrar la colección de marcas, basta con pasar su repositorio como `brands` a `BrowseCatalog`.
