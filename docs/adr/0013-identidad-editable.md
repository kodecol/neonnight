# ADR 0013 — Marca blanca, fase 1: identidad de la tienda editable

**Fecha:** 2026-10-21 · **Estado:** aceptada · **Amplía:** ADR 0008 y 0009

## Contexto

El nombre, el wordmark y el isotipo de Neon Night estaban en el código, y varios textos lo escribían a mano (pie de página, aviso del carrusel de marcas, mensajes de WhatsApp, descripción del pago en Bold, título del panel, imágenes de vista previa). Para convertir la tienda en una plantilla de marca blanca hay que poder cambiar la identidad sin tocar el código y sin cambiar el aspecto de producción.

## Decisión

- **Contrato:** `StoreIdentitySchema` (`application/dto/identity.dto.ts`), un esquema Zod con nombre, wordmark, frase, descripción para buscadores, isotipo y logo horizontal (`{ src, alt, ratio }`). Es el contrato del futuro `brand.config.json` del CLI de Kodecol y se convertirá a JSON Schema tal cual. Los datos legales de la empresa NO están aquí: siguen en Legales (`companySettings`).
- **`brand:apply`:** `ApplyIdentity` valida un objeto cualquiera y lo publica. Es la entrada que usará el CLI. `SaveIdentity` hace lo mismo con modo borrador o publicación desde el panel.
- **Persistencia:** `settings` con `_id: "brand"`, que guarda `published`, `draft` e `history` (últimas 10). Sin nada publicado rige la identidad del código, así que producción no cambia. Lo publicado se cachea 10 s y se renueva al publicar.
- **Fusión:** `ManagedSiteContentRepository` aplica la identidad sobre `brand` y al final reemplaza la ficha `{tienda}` en todos los textos con el nombre vigente. Así cambian solos el pie de página, el aviso de revendedor independiente, el antetítulo por defecto, los títulos, el JSON-LD, las vistas previas, el panel y el 404. Los mensajes de WhatsApp y la descripción del pago en Bold dejan de nombrar la tienda.
- **Imágenes:** `Isotype` acepta el isotipo configurado y, si no hay, usa el del sitio. `WideLogo`, si existe, reemplaza isotipo + wordmark en la barra y el pie. Se suben a `neonnight/sitio/identidad` con la misma revisión de SVG que las marcas. Las vistas previas piden el isotipo a Cloudinary en PNG.
- **Panel:** `/admin/ajustes/identidad`, con la misma estética y flujo que Inicio (vista previa en `/admin/vista-previa/identidad`, publicar, versiones e "identidad de fábrica"). La pestaña la registra el módulo de Ajustes.
- **404 dinámicos** (`connection()`) con el nombre y el isotipo vigentes.

## Fuera de esta fase

Colores (fase 2), tipografía (fase 3) y favicon y manifest dinámicos (fase 4).

## Consecuencias

- Un texto nuevo que nombre la tienda debe escribir `{tienda}`, no el nombre literal.
- `container.codeContent` expone el contenido del código sin lo editado (la identidad "de fábrica").
