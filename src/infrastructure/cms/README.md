# Adaptador de CMS (pendiente)

Aquí vive el cliente del CMS y los mappers a entidades de dominio cuando se
elija proveedor (Sanity, Payload, Strapi…). Mientras tanto `seed.ts` alimenta
el `InMemoryWatchRepository` con los 8 productos del prototipo.

Para sustituirlo:

1. Implementar `WatchRepository` (src/domain/repositories) sobre el cliente del CMS.
2. Mapear el documento del CMS a `Watch` usando `Money.fromUnits`, `Slug.of`, `Reference.of`.
3. Registrar la nueva clase en `src/infrastructure/container.ts`.

Nada fuera de `infrastructure/` debería cambiar. Si algo más cambia, la frontera estaba mal puesta.
