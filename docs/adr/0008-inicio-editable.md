# ADR 0008 — Página de inicio editable: biblioteca del sitio, hero, banda, compromisos, testimonios y redes

**Fecha:** 2026-10-20 · **Estado:** aceptada · **Amplía:** ADR 0006 y 0007

## Contexto

Todo el contenido de la home vivía en `site-content.ts`: cambiar la foto de la banda o el mensaje principal exigía tocar código y desplegar. La administración quería autogestionar la home de forma sencilla, empezando por lo más visible.

## Decisión

- **Biblioteca de medios del sitio** (`site_media` en Mongo), aparte de las fotos del catálogo. Las fotos suben por el servidor a Cloudinary (`neonnight/sitio`) con los mismos límites del panel. Los videos suben **directo del navegador a Cloudinary** con una firma del servidor (`VideoUploadSigner`), así que la app no carga archivos grandes; al registrarlos se valida que la URL sea de nuestra nube y carpeta. Cloudinary genera el fotograma de portada (`so_0`).
- **Contenido de la home** (`settings`, `_id: "home"`): el hero sigue a la pieza destacada (como antes) o usa un medio propio con antetítulo, título, texto y botón (solo rutas internas). La banda lleva foto, frase y encuadre (arriba, centro o abajo). Todo lo que queda vacío cae en `SiteContent`, así que la home nunca se rompe.
- **Integridad:** no se puede borrar un medio en uso (`MediaInUseError`), la banda solo acepta fotos y el hero propio exige medio y título. Al quitar un medio se borra también de Cloudinary, solo dentro de `neonnight/sitio`.
- **Publicación inmediata:** guardar revalida la tienda. El borrador con vista previa y el historial de versiones quedan para la fase 3.

## Fase 2: compromisos, testimonios y redes

- Se guardan en el mismo documento (`settings/home`) como bloques **opcionales**: `null` significa "nunca editado" y la tienda sigue los textos del código. El editor siempre muestra el contenido actual, pero solo envía un bloque si se tocó, así que guardar el hero no altera los demás.
- La fusión vive en una función pura (`application/lib/merge-site-content.ts`) que usa `ManagedSiteContentRepository`: todas las páginas reciben el contenido ya combinado, sin cambios en las rutas. Si la base no responde, el sitio sigue con el contenido del código. El documento se guarda 10 s en memoria y se renueva al guardar (una sola instancia).
- **Compromisos:** siempre tres, numerados solos; el último lleva el acento.
- **Testimonios:** se publican solo los **visibles y con autorización escrita del cliente** (Ley 1480). Los del código entran al editor como "ejemplo" sin autorización, para que se reemplacen por reales.
- **Redes:** cada red se activa o apaga, y su enlace debe ser https y del dominio de esa red. Las apagadas desaparecen de la home, el menú, el pie de página (enlace especial `redes`) y los datos estructurados.

## Consecuencias

- La fase 3 (orden y visibilidad de bloques, borrador con vista previa e historial) reutiliza el mismo documento de ajustes.
- Las páginas legales y los plazos siguen en el código, con su fecha de vigencia y versión (ADR 0006).
