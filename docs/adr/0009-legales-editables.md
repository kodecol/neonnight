# ADR 0009 — Páginas legales y datos de la empresa editables desde el panel

**Fecha:** 2026-10-21 · **Estado:** aceptada · **Amplía:** ADR 0006 y 0008

## Contexto

Las siete páginas institucionales y legales (ADR 0006) vivían en el código: cambiar una cláusula, el correo o la transportadora exigía un despliegue. La administración quiere editarlas con borrador, vista previa, versiones y la fecha de vigencia visible, y que el checkout registre qué versión de los términos aceptó cada cliente.

## Decisión

- **Markdown mínimo, mismos bloques.** El editor trabaja un markdown reducido (`application/lib/legal-markdown.ts`): secciones `## Título {#ancla}`, párrafos, listas, `> nota`, tablas con pipes y dos bloques explícitos `::: pasos` / `::: datos`. Se convierte en los mismos `InfoBlock` que ya pinta la tienda: la página pública no cambia de diseño. Serializar y parsear son funciones puras con prueba de ida y vuelta sobre las siete páginas de código.
- **Fichas con datos de la empresa:** `{empresa}`, `{correo}`, `{correo_datos}`, `{matricula}`, `{transportadora}`, `{rastreo}`… se reemplazan al pintar. Al sembrar el editor desde el texto de código, los valores literales se cambian por su ficha; así, un cambio de correo o de transportadora llega también a las páginas ya publicadas.
- **Validación antes de guardar** (servidor y, en vivo, en el editor con el mismo código): sin pérdidas al convertir, anclas únicas, fichas conocidas, solo destinos seguros y enlaces internos a rutas y anclas que existen.
- **Borrador, vista previa y versiones** como en Inicio: el borrador se ve en `/admin/vista-previa/legal/[slug]` (bajo `/admin` por la cookie de sesión); publicar asigna la versión siguiente (la de código es 1.0; menor por defecto, mayor con "Cambio importante") y la fecha de vigencia en hora de Colombia. Se guardan las últimas 10 versiones para cargarlas en el editor; "Volver al texto de fábrica" deja lo publicado en el historial y la numeración continúa.
- **Persistencia:** `legal_pages` (un documento por página: `published`, `draft`, `history`) y `settings/company` para los datos de la empresa y la transportadora. `ManagedSiteContentRepository` combina todo: `content.page(slug)` devuelve lo publicado o la página de código redactada con los datos editados, y `content.get()` trae `company` y `policies.shipping` fusionados. Caché de 10 s renovada al escribir.
- **Transportadora:** pasa a Interrapidísimo, con `trackingUrl`. Los textos que la nombran salen de `policies.shipping` y, si se cambia en el panel, los de la home y las tarjetas se actualizan solos. Los plazos de tránsito siguen en el código.
- El checkout lee `content.page("terminos")` y `content.page("privacidad")` (`version`, `updatedAt`) para registrar la aceptación.

## Consecuencias

- Las páginas publicadas se guardan como markdown: una mejora del diseño de bloques sigue aplicando a todas.
- El texto de código sigue siendo la base de fábrica; actualizarlo no pisa lo publicado en el panel.
- Los textos legales siguen necesitando revisión de un abogado: el panel facilita el cambio, no lo valida jurídicamente.
