# ADR 0005 — Catálogo multilínea: líneas con plantilla, variantes y stock

**Fecha:** 2026-10-20 · **Estado:** aceptada · **Amplía:** ADR 0004

## Contexto

La tienda vendía solo relojes, y el modelo lo reflejaba en todas las capas: entidad `Watch`, ficha fija de reloj, una unidad por pieza y la ruta `/reloj/[slug]`. El catálogo se amplía a **relojería, joyería y perfumería**, y se pidió:

- Líneas separadas y flexibles: el administrador debe poder crear otra (p. ej. gafas) sin tocar código.
- Variantes: tallas en joyería y mililitros en perfumería, cada una con su precio.
- Filtros, vistas y detalle adaptados a cada tipo de producto, con un diseño minimalista y profesional.

## Decisión

### Modelo

- `Watch` pasa a ser `Product`.
- Cada producto pertenece a una **línea** (`ProductLine`) y a una **categoría** de esa línea.
- Las líneas se administran como las categorías: el slug es la identidad.
- **Plantilla por línea** (`reloj | joya | perfume | general`). Se fija al crear la línea y decide:
  - la ficha técnica: unión discriminada `ProductSpecs` por `kind`;
  - las facetas de filtrado;
  - los módulos del detalle (p. ej. pirámide olfativa en perfumes);
  - cómo se vende (`SALE_MODE`): `pieza` (reloj, joya) o `unidades` (perfume, general).
- Una línea nueva con plantilla `general` usa filas libres "etiqueta: valor" y los filtros comunes. Así es flexible sin caer en atributos genéricos para todo: las tres líneas conocidas conservan fichas tipadas, validación y filtros reales.

### Variantes y stock

- Todo producto tiene al menos una `ProductVariant` con etiqueta, precio y stock. La etiqueta vacía marca la variante única, y la tienda no muestra selector.
- El precio que se muestra es "desde" el menor con stock.
- `availability` queda como estado **manual** (disponible, reservado, vendido). El agotado se **deriva del stock** con `productStatus`: en `pieza` se lee "Vendido"; en `unidades`, "Agotado" o "Últimas unidades".
- La bolsa identifica cada línea por producto y variante, y admite cantidad hasta `min(stock, 10)`. En piezas, la cantidad máxima es 1.
- El checkout:
  - une las líneas repetidas;
  - recalcula el total por variante;
  - rechaza si no hay stock suficiente.
- `ConfirmPayment` descuenta stock por variante con un `$inc` condicionado (`$elemMatch` + operador posicional). Ya no marca la pieza como `vendido`: el estado se deriva.

### Catálogo y vistas

- Rutas:
  - `/coleccion` y `/coleccion/[linea]` (indexables).
  - Detalle por plantilla: `/reloj`, `/joya`, `/perfume` y `/producto/[slug]`. Comparten un solo render (`(store)/_product`). Si el slug pertenece a otra plantilla, redirige con 301.
  - `/coleccion?categoria=x` antiguo redirige a la línea de esa categoría.
- Filtros por searchParams, resueltos en `BrowseCatalog`:
  - **Conteos disyuntivos:** cada faceta cuenta con el resto de filtros aplicados.
  - Se ocultan las opciones vacías y las facetas que no ayudan a elegir.
  - Lo que no se puede comprar va al final.
- Se calcula en memoria sobre una sola consulta, porque el catálogo es de cientos de piezas. `minPriceCents` se desnormaliza en Mongo por si hiciera falta llevar el filtrado a la base.
- La UI de filtros no requiere JS:
  - pestañas de línea, chips de categoría y un panel `<details>` con enlaces;
  - orden y etiquetas de filtros activos que se quitan con un clic;
  - con JS, el panel se cierra con Escape y al hacer clic fuera.

### Datos

- **Migración en la conexión, idempotente** (`mongo/migrate.ts`):
  - `watches` se renombra a `products`;
  - los documentos sin variantes pasan a la línea `relojeria` con una variante `unica` (stock 0 si estaban vendidos);
  - las categorías sin línea pasan a `relojeria`;
  - las órdenes viejas (`watchId`) se leen igual.
- **Seed versionado** (`SEED_VERSION`, `since` por elemento):
  - una base ya sembrada solo recibe lo nuevo, con `$setOnInsert`;
  - nunca se pisa ni se re-crea lo que el panel editó o borró.
- **Bolsa en el navegador:** las bolsas `neonnight.cart.v1` se migran a `v2`. El servidor acepta `watchId` y resuelve la variante única.

## Consecuencias

- Una línea nueva se crea en el panel con nombre y plantilla. Una plantilla nueva con ficha propia sí exige código:
  - su `kind`;
  - su esquema zod;
  - sus filas en `spec-rows.ts`;
  - sus facetas en `facets.ts`;
  - sus campos en `SpecsFields.tsx`;
  - sus textos en `product.byKind`.
- Entre el checkout y la confirmación no se reserva stock: dos pagos simultáneos por la última unidad pueden aprobarse. Si pasa, `decrementStock` deja la variante en 0, devuelve `false` y se registra un aviso para resolverlo a mano. Con el volumen actual es aceptable; la alternativa es reservar al crear la orden y liberar al vencer el link de pago.
- El detalle de cada plantilla y el contenido por tipo viven en `site-content.ts` (`product.byKind`). La tienda no tiene textos de producto escritos a mano en los componentes.
