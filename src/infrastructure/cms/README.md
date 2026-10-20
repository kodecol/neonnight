# Catálogo: seed y persistencia

- `seed/` define las líneas (`index.ts`), las categorías y los productos de cada línea (`watches.ts`, `new-watches.ts`, `jewelry.ts`, `perfumes.ts`). Cada elemento declara `since`, la versión del seed en que apareció (`SEED_VERSION` en `build.ts`).
- **Con `MONGODB_URI`:** el catálogo vive en MongoDB (`../mongo/`).
  - Cada arranque migra una base de la v1, si la hay (`migrate.ts`).
  - Después inserta solo lo que falte de versiones posteriores a la ya aplicada (marcador `meta.seed.version`), con `$setOnInsert`: nunca pisa ni re-crea lo editado o borrado en `/admin`.
- **Sin `MONGODB_URI`:** `InMemoryProductRepository`, `InMemoryLineRepository` e `InMemoryCategoryRepository` sirven el seed en memoria, sin persistencia. Así corren los tests y el e2e.

Para añadir productos al seed: agrégalos al archivo de su línea con `since: SEED_VERSION + 1` y sube `SEED_VERSION`.

Para cambiar de proveedor (otro CMS o base):

1. Implementar `ProductRepository`, `LineRepository` y `CategoryRepository` (`src/domain/repositories`).
2. Mapear a `Product` con `Money`, `Slug` y `Reference` (ver `../mongo/product-mapper.ts`).
3. Registrar las clases en `src/infrastructure/container.ts`.

Nada fuera de `infrastructure/` debería cambiar.
