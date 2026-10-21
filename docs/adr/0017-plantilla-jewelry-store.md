# ADR 0017: Neon Night como plantilla `jewelry-store` de Kodecol

**Fecha:** 2026-10-21 · **Estado:** propuesta (rama `feat/marca-blanca`, pendiente de aprobación) · **Amplía:** ADR 0013, 0015 y 0016

## Contexto

Kodecol va a revender la tienda como marca blanca a joyerías, relojerías y e-commerce. Lo hará con su plataforma **Kode** (CLI, API y MCP), que registra servidores y aprovisiona por cliente la base, los secretos, el contenedor y el dominio. Hasta ahora, la identidad (ADR 0013), la apariencia (ADR 0015) y los íconos (ADR 0016) ya se editaban desde el panel. Pero el código seguía siendo de Neon Night en tres frentes:

- los textos y datos de fábrica;
- el catálogo que se sembraba solo al conectar;
- la base "neonnight" por defecto y las claves y carpetas con nombre fijo.

Además, no existía un contrato que una herramienta externa pudiera usar.

## Decisión

1. **Una instalación por cliente**, no multi-tenant. Cada cliente tiene su base (`MONGODB_DB`, obligatoria), su volumen de medios y su contenedor. **Una sola imagen** para todos: la marca nunca se decide en el build.
2. **Contrato versionado** en la raíz del repo:
   - `template.manifest.json`;
   - `brand.schema.json`, generado desde Zod para que el código sea la fuente única;
   - `examples/brand.example.json`.
3. **Ciclo de vida dentro de la imagen** (`lifecycle.mjs`):
   - comandos `migrate`, `brand:apply` y `seed`;
   - idempotentes, con salida JSON y códigos de salida estables;
   - corren sin el servidor.
4. **Migraciones versionadas** en `meta/schema`: reemplazan los pasos sueltos que hacía la conexión.
5. **Defaults neutros** en el código. Neon Night pasa a ser un brand pack (`brands/neonnight/brand.json`) que reproduce su apariencia actual.
6. **Slug en runtime** (`STORE_SLUG`) para las claves del navegador, las carpetas de medios y el prefijo de pedidos.
7. Las imágenes del `brand.json` se **descargan al aplicar** y nunca se leen en runtime desde su URL de origen, para evitar SSRF y no depender de terceros.

## Consecuencias

- **Neon Night no puede desplegar esta rama tal cual.** Antes hay que aplicar su brand pack y fijar `STORE_SLUG=neonnight` y `STORE_ORDER_PREFIX=NN` (`MONGODB_DB` ya está en su `.env`). Si no, se vería como "Tu tienda" y su gente perdería bolsas y consentimientos. El procedimiento está en `docs/handoff/2026-10-21-marca-blanca.md`.
- **Los testimonios de ejemplo desaparecen.** Solo se publican testimonios reales con autorización (Ley 1480).
- **Cambiar el contrato tiene reglas.** Los campos nuevos del `brand.json` deben ser opcionales, y la versión se sube a la vez en los tres lugares (lo controla un test).
- **Las vistas previas OG siguen usando Archivo** aunque Apariencia elija otra fuente de títulos (ADR 0015).
