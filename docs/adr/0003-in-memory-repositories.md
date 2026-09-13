# ADR 0003 — Repositorios en memoria y stubs para CMS, pagos y analítica

**Fecha:** 2026-09-13 · **Estado:** aceptada (temporal)

## Contexto

El CMS, la pasarela y el proveedor de analítica no están decididos. El handoff pide construir primero contra un repositorio en memoria con los 8 productos del prototipo (§6, pasos 2–5).

## Decisión

- `InMemoryWatchRepository` alimentado por `infrastructure/cms/seed.ts` (8 productos, precios y subtítulos exactos del prototipo, solo la 01 con media real).
- `NoopPaymentGateway` devuelve la orden como pendiente y redirige a `/gracias`.
- `ConsoleAnalytics` imprime eventos en desarrollo; `NoopAnalytics` en tests.
- `WaMeLinkBuilder` lee `NEXT_PUBLIC_WHATSAPP_NUMBER`; sin número, los enlaces se renderizan deshabilitados con la leyenda "pendiente".
- `InMemoryOrderRepository` guarda órdenes solo en el proceso: se pierden al reiniciar.

## Consecuencias

- El sitio es completamente navegable y testeable sin servicios externos.
- Al elegir proveedor, cada stub se sustituye por su adaptador y se registra en `container.ts`. Si algo fuera de `infrastructure/` cambia, la frontera estaba mal puesta.
- Las órdenes en memoria **no sirven para producción**: el checkout real exige `OrderRepository` persistente antes de cobrar.
