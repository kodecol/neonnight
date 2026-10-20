# ADR 0006 — Páginas legales, SEO y medición con consentimiento

**Fecha:** 2026-10-20 · **Estado:** aceptada · **Amplía:** ADR 0001 y 0005

## Contexto

La tienda vende a distancia en Colombia y debía publicar la información que exige la ley (Ley 1480 de 2011, art. 50: identidad del vendedor, precios, plazos de entrega, garantía, retracto y reversión del pago; Ley 1581 de 2012: política de tratamiento de datos). El pie de página prometía páginas de garantía y devoluciones que no existían. Además se pidió mejorar el SEO, tener una imagen de vista previa al compartir enlaces y medir con Google Analytics 4 y el píxel de Meta.

## Decisión

- **Páginas como contenido estructurado, no como HTML.** `InfoPage` (`application/dto/info-page.dto.ts`) describe secciones y bloques (`p`, `list`, `steps`, `table`, `note`, `facts`). El texto admite solo `**negrita**` y `[enlace](/ruta)`, que `parseRichText` convierte en nodos: nada de `dangerouslySetInnerHTML` y solo destinos internos, `https:` o `mailto:`. Los textos viven en `infrastructure/content/pages/` y el puerto `SiteContentRepository.page(slug)` los entrega.
- **Fuente única de plazos.** `SITE_CONTENT.company` (identidad: matrícula mercantil, ciudad, correo) y `SITE_CONTENT.policies` (garantía, días de devolución, transportadora, tiempos) alimentan las páginas, los textos de la home y los datos estructurados. Un test unitario verifica que las cifras coinciden en todos los sitios.
- **Rutas explícitas** (`/nosotros`, `/envios`, `/pagos`, `/garantia`, `/devoluciones`, `/terminos`, `/privacidad`), finas, que delegan en `(store)/_info/render-info.tsx`. Son dinámicas como el resto: el layout lee la configuración en runtime.
- **SEO:** canonical en la home, `OnlineStore` con contacto y `MerchantReturnPolicy`, una `Offer` por presentación con `shippingDetails` y política de devoluciones, `AboutPage`/`WebPage` y migas en las páginas nuevas, sitemap ampliado y etiquetas de verificación por variables de entorno.
- **Vista previa al compartir:** `/og` (general) y `/og?linea=` (por línea) con `next/og`, la fuente Archivo (WOFF en `public/fonts/og/`) y el isotipo. Las fotos salen de Cloudinary convertidas a PNG/JPG (el renderizador no lee WebP). Las fichas mantienen su `opengraph-image` con la foto de la pieza.
- **Medición solo con consentimiento.** Sin `GA_MEASUREMENT_ID` ni `META_PIXEL_ID` no hay banner ni scripts. Con alguno, el banner ofrece aceptar, rechazar y configurar con el mismo peso; la elección se guarda 12 meses en `neonnight.consent.v1`. GA4 se carga solo con analítica aceptada (modo de consentimiento con publicidad denegada si no hay permiso de marketing) y el píxel solo con publicidad aceptada. Retirar el permiso los apaga y borra sus cookies. Los IDs se validan con una expresión regular antes de llegar al navegador.
- **Eventos de comercio** con una sola fachada (`presentation/analytics/track.ts`): `view_item_list`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase` (una vez por pedido, con `eventID` para deduplicar en Meta) y `generate_lead`/`Contact` en los clics a WhatsApp. Los componentes no llaman a `gtag` ni a `fbq`.
- **WhatsApp fuera de las fichas.** El botón de compra pasa a "Comprar ahora" (paga solo esa pieza) y "Añadir a la bolsa". La asesoría queda en un botón fijo discreto (con el mensaje de la pieza en la ficha), en el menú y en el pie de página.

## Consecuencias

- Cambiar un plazo es editar `policies` y revisar el texto legal afectado; los tests avisan si la home y las páginas dejan de coincidir.
- Cada cambio legal debe actualizar `LEGAL_EFFECTIVE_DATE` y `LEGAL_VERSION` (`pages/context.ts`).
- La identidad del propietario y su NIT (`company.owner`) son opcionales: las páginas los muestran cuando existen.
- Fase 2 posible: la API de conversiones de Meta desde el webhook de Bold, para medir compras aunque el navegador bloquee el píxel.
- Los textos legales son una base redactada sobre la normativa vigente. Un abogado debe revisarlos antes del lanzamiento.
