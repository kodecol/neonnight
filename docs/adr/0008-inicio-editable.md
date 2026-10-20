# ADR 0008 — Página de inicio editable: biblioteca del sitio, hero y banda (fase 1)

**Fecha:** 2026-10-20 · **Estado:** aceptada · **Amplía:** ADR 0006 y 0007

## Contexto

Todo el contenido de la home vivía en `site-content.ts`: cambiar la foto de la banda o el mensaje principal exigía tocar código y desplegar. La administración quería autogestionar la home de forma sencilla, empezando por lo más visible.

## Decisión

- **Biblioteca de medios del sitio** (`site_media` en Mongo), aparte de las fotos del catálogo. Las fotos suben por el servidor a Cloudinary (`neonnight/sitio`) con los mismos límites del panel. Los videos suben **directo del navegador a Cloudinary** con una firma del servidor (`VideoUploadSigner`), así que la app no carga archivos grandes; al registrarlos se valida que la URL sea de nuestra nube y carpeta. Cloudinary genera el fotograma de portada (`so_0`).
- **Contenido de la home** (`settings`, `_id: "home"`): el hero sigue a la pieza destacada (como antes) o usa un medio propio con antetítulo, título, texto y botón (solo rutas internas). La banda lleva foto, frase y encuadre (arriba, centro o abajo). Todo lo que queda vacío cae en `SiteContent`, así que la home nunca se rompe.
- **Integridad:** no se puede borrar un medio en uso (`MediaInUseError`), la banda solo acepta fotos y el hero propio exige medio y título. Al quitar un medio se borra también de Cloudinary, solo dentro de `neonnight/sitio`.
- **Publicación inmediata:** guardar revalida la tienda. El borrador con vista previa y el historial de versiones quedan para la fase 3.

## Consecuencias

- Las fases siguientes (compromisos de garantía, testimonios con autorización, redes, orden y visibilidad de bloques) reutilizan la misma biblioteca y el mismo documento de ajustes.
- Las páginas legales y los plazos siguen en el código, con su fecha de vigencia y versión (ADR 0006).
