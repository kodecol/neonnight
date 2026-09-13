# ADR 0001 — Clean architecture en cuatro capas con fronteras verificadas por lint

**Fecha:** 2026-09-13 · **Estado:** aceptada

## Contexto

El handoff (§5.2) pide dominio, aplicación, infraestructura y presentación con dependencias hacia dentro, y advierte que sin un chequeo automático la separación se degrada en semanas.

## Decisión

- `src/domain` — entidades, value objects, interfaces de repositorio y reglas puras. No importa nada externo (ni React, ni Next, ni zod).
- `src/application` — casos de uso, DTOs y puertos de salida (`PaymentGateway`, `Analytics`, `WhatsAppLinkBuilder`, `Clock`). Importa solo dominio.
- `src/infrastructure` — implementaciones (en memoria, stubs) y `container.ts`.
- `src/presentation` — componentes, hooks, estilos y helpers. Importa dominio y aplicación (DTOs y puertos), **nunca infraestructura**.
- `src/app` — rutas del App Router. Es la única capa que llama a `getContainer()` y pasa DTOs hacia abajo.

Next.js exige que las rutas vivan en `src/app`, por eso la capa de presentación se divide en dos carpetas físicas (`app` = rutas finas, `presentation` = todo lo demás). Ambas se declaran como elementos en `eslint-plugin-boundaries` y el lint falla ante cualquier import cruzado prohibido.

## Consecuencias

- Sustituir el repositorio en memoria por un CMS solo toca `infrastructure/`.
- Los tests de casos de uso corren sin red ni mocks de módulos: `createContainer({ watches: new InMemoryWatchRepository([...]) })`.
- Los componentes reciben URLs de WhatsApp ya construidas desde la ruta; no conocen el número ni el formato `wa.me`.
