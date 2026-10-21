# ADR 0012 — Checkout con datos del comprador, pedido manual y panel de pedidos

**Fecha:** 2026-10-21 · **Estado:** aceptada · **Amplía:** ADR 0004 y 0006

## Contexto

La bolsa enviaba directo a `/api/checkout`. Con Bold inactivo, el gateway de respaldo redirigía en silencio a `/gracias`: no se pedían datos del cliente, no quedaba constancia de la aceptación de los términos y las órdenes solo podían verse en Mongo.

## Decisión

- **`/checkout`** (sin indexar): un resumen verificado en el servidor (`POST /api/checkout/quote`: precios, stock, envío sin costo, problemas por línea, sin crear nada), los datos del comprador (nombre, documento CC/CE/NIT/PP, correo, celular colombiano normalizado a +57, dirección, ciudad, departamento, notas) y una casilla obligatoria de aceptación de los términos y de la política de privacidad **con su versión vigente**.
- **La orden guarda** comprador, consentimiento (`termsVersion`, `privacyVersion`, `acceptedAt`), medio de pago (`bold` | `manual`) y envío. Las referencias son legibles: `NN-AAMMDD-XXXXX`. Si el cliente aceptó una versión que ya no es la vigente, el servidor rechaza el pedido y le pide aceptar de nuevo.
- **Modo de pago** (`paymentModeOf`): Bold si está listo; si no, el **pedido manual** cuando el panel › Pagos lo permite (instrucciones editables; en `/gracias` el cliente ve las instrucciones y un botón para coordinar por WhatsApp); si no, el checkout avisa y no deja comprar. Nada pasa en silencio.
- **`/gracias`** muestra el estado y, con Bold pendiente, se refresca sola hasta que llega el webhook. No muestra datos personales, solo la referencia y el total.
- **Panel › Pedidos:** lista con filtros por estado y detalle con piezas, totales, comprador, entrega y consentimiento. Los pedidos manuales se marcan como pagados (lo que descuenta el stock con la misma función que el webhook, `markOrderPaid`) o se cancelan. Los de Bold solo cambian por el webhook.
- "Comprar ahora" suma la pieza a la bolsa y lleva al checkout. "Finalizar compra" en la bolsa también.

## Consecuencias

- Las órdenes anteriores se leen sin comprador ni consentimiento (`null`) y con envío 0. No hay migración.
- Falta confirmar con un pago de prueba de Bold la forma del webhook (`data.metadata.reference`, `data.amount.total`).
- Los datos personales de las órdenes quedan cubiertos por la política de privacidad (finalidad: procesar el pedido) y solo los ve el panel.
