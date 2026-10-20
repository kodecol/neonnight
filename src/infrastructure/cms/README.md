# Catálogo: seed y persistencia

- `seed.ts` define las 8 referencias iniciales y las 4 categorías.
- **Con `MONGODB_URI`:** el catálogo vive en MongoDB (`../mongo/`). La primera conexión a una base vacía inserta el seed una sola vez (marcador `meta.seed`). Desde ahí la fuente de verdad es la base y se edita en `/admin`.
- **Sin `MONGODB_URI`:** `InMemoryWatchRepository` e `InMemoryCategoryRepository` sirven el seed en memoria, sin persistencia. Así corren los tests y el e2e.

Para cambiar de proveedor (otro CMS o base):

1. Implementar `WatchRepository` y `CategoryRepository` (`src/domain/repositories`).
2. Mapear a `Watch` con `Money`, `Slug` y `Reference` (ver `../mongo/watch-mapper.ts`).
3. Registrar las clases en `src/infrastructure/container.ts`.

Nada fuera de `infrastructure/` debería cambiar.
