# ADR 0014 — Gestión de pedidos: papelera, historial y revisión

**Fecha:** 2026-10-20 · **Estado:** aceptada · **Amplía:** ADR 0012

## Contexto

El panel de Pedidos solo listaba por estado y dejaba marcar pagado o cancelar. Los pedidos de prueba o abandonados se acumulaban sin forma de quitarlos, no se podía buscar a un cliente ni sacar los pedidos a una hoja de cálculo, y no quedaba constancia de quién cambió qué. Borrar de verdad un pedido pendiente de Bold tiene un riesgo: el link de pago dura 30 minutos y, si el cliente paga después de borrarlo, el webhook respondería "orden desconocida" y el cobro quedaría sin pedido.

## Decisión

- **Borrado suave, solo de pendientes.** `DeleteOrders` valida en el servidor (error de dominio `OrderNotDeletableError`) que cada pedido esté `pendiente` y activo; si uno falla no se elimina ninguno. Pagados, cancelados y rechazados quedan como registro. Eliminar pone `deletedAt` y lleva el pedido a **Eliminados**, donde espera 30 días (`ORDER_TRASH_DAYS`) con **Restaurar** y **Purgar** (la purga definitiva solo es posible desde la papelera: `OrderNotInTrashError`). Se puede eliminar uno (detalle) o varios (casillas en la lista; solo los pendientes se pueden marcar, hasta 100 por vez).
- **Purga sin cron.** `OrderRepository.purgeExpired(now)` borra lo eliminado hace más de 30 días y `ListAdminOrders` lo llama cada vez que se abre Pedidos (lista o papelera). Basta con que alguien entre al panel; un pedido vencido que nadie mira no molesta a nadie.
- **Un eliminado sigue existiendo para quien lo necesita.** `findById` y `findByPaymentReference` lo encuentran: `/gracias?orden=` y el webhook funcionan igual. La lista normal, los conteos y cualquier métrica usan `list`/`count`, que por defecto excluyen la papelera (`deletedAt: null`, que en Mongo también cubre los documentos sin el campo).
- **Pago tras eliminar.** Si el webhook aprueba un pedido eliminado, `ConfirmPayment` lo restaura (`deletedAt = null`), aplica el pago normal (estado `pagada`, stock descontado) y deja `review = "Pago recibido de pedido eliminado — revisar"` con el evento `pago-tras-eliminar`. La lista lo destaca (franja magenta y etiqueta "Revisar", más un aviso con enlace a `?revisar=1`) y el detalle muestra el aviso con **Marcar revisado** (evento `revisado`). Un rechazo sobre un eliminado solo lo marca `fallida` y lo deja en la papelera.
- **Aviso del link vigente.** Al eliminar, la confirmación advierte si el pedido es de Bold, tiene referencia de pago y se creó hace menos de 30 minutos (`paymentLinkMayBeLive`, misma constante `PAYMENT_LINK_TTL_MS` que el gateway). La papelera de 30 días cubre de sobra esa ventana: un pago tardío nunca llega a un pedido ya purgado.
- **Historial (`events`).** Cada pedido guarda `{ at, type, by, note? }`: `creado` (cliente, en el checkout), `pagado`/`cancelado` (panel), `pagado`/`fallido`/`pago-tras-eliminar` (webhook), `eliminado`, `restaurado` y `revisado` (panel). El detalle lo muestra en orden. Las órdenes anteriores no traen historial y lo dicen.
- **Lista con filtros por URL.** `?estado=`, `?vista=eliminados`, `?revisar=1`, `?q=` (id, nombre, correo o celular; sin tildes ni mayúsculas, y el celular por sus dígitos: el mismo patrón `orderSearchPatterns` sirve al repositorio en memoria y a `$regex` en Mongo), `?desde=`/`?hasta=` (AAAA-MM-DD en hora de Bogotá, ambos inclusive) y `?pagina=` (25 por página). El formulario es GET y funciona sin JS.
- **CSV.** `GET /admin/pedidos/exportar` con los mismos parámetros descarga lo filtrado (todas las páginas): separado por punto y coma, con BOM y fechas de Bogotá para que Excel en español lo abra bien, y con apóstrofo delante de las celdas que empiezan como fórmula (`=`, `+`, `-`, `@`; por eso el celular sale `'+57 …`). Lleva datos personales: el handler verifica la sesión con `isAdmin()` por su cuenta, porque el middleware no corre para las peticiones con cabecera `next-action`.

## Consecuencias

- `deletedAt`, `events` y `review` son opcionales en Mongo: los documentos existentes se leen activos, sin historial y sin marca. No hay migración; se añade el índice `{ deletedAt: 1, createdAt: -1 }`.
- La purga es definitiva (no hay copia). Si hiciera falta conservar algo, se exporta el CSV antes.
- Restaurar devuelve el pedido tal como estaba, incluido su estado. Un pedido pendiente restaurado puede volver a eliminarse.
- La búsqueda con `$regex` no usa índice; con el volumen de la tienda es suficiente. Si creciera, se pasaría a un campo normalizado de búsqueda.
