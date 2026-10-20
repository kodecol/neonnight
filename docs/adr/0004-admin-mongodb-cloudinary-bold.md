# ADR 0004 — Panel /admin con MongoDB, Cloudinary y Bold

**Fecha:** 2026-10-03 · **Estado:** aceptada · **Reemplaza en parte:** ADR 0003

## Contexto

El catálogo vivía en una constante TS (`cms/seed.ts`), las órdenes en memoria y los pagos eran un stub. Se necesita un panel mínimo, con la estética de la tienda, para un único administrador: catálogo (relojes, fotos y categorías) y configuración de pagos con Bold (Colombia). Requisito explícito: nada que haya que instalar en el servidor.

## Decisión

- **Datos:** MongoDB (Atlas en producción) con el driver oficial `mongodb`, sin ODM. Repositorios en `infrastructure/mongo/` que implementan los puertos del dominio. La primera conexión crea índices y siembra el catálogo una sola vez (marcador en `meta`). Sin `MONGODB_URI` el contenedor usa los repositorios en memoria (tests y e2e deterministas). En local, `docker-compose.yml` levanta Mongo en el puerto 27018.
- **Fotos:** Cloudinary vía `CLOUDINARY_URL`. Sin esa variable se usa `LocalDiskMediaUploader` (`.data/uploads`, servido por `/api/media/<archivo>`), que es solo para desarrollo. Las fotos se suben con una server action (límite 10 MB por cuerpo, 8 MB por foto) y el navegador mide sus dimensiones antes de subirlas.
- **Categorías:** dejan de ser un union type y pasan a ser una colección administrable. El slug es la identidad y no cambia después de crear la categoría. No se puede borrar una categoría que tenga relojes asignados.
- **Auth:** un solo admin con `ADMIN_PASSWORD`.
  - La sesión es una cookie `nn_admin` firmada con HMAC (`ADMIN_SECRET`, Web Crypto), `httpOnly`, válida 7 días.
  - El middleware protege `/admin/*` y cada server action vuelve a verificar la sesión.
- **Pagos:** `BoldPaymentGateway` usa la API de Links de pago de Bold.
  - Crea un link cerrado por el total recalculado en el servidor, con la orden como referencia, y redirige a `checkout.bold.co`.
  - El webhook `/api/webhooks/bold` verifica `x-bold-signature` (HMAC-SHA256 hex del cuerpo en Base64; en pruebas la llave es vacía).
  - El webhook ejecuta `ConfirmPayment`, que es idempotente y compara el monto: con la venta aprobada, la orden queda pagada y la pieza vendida; con la rechazada, la orden queda fallida.
  - Con Bold inactivo, delega en `NoopPaymentGateway` (flujo anterior).
- **Llaves de Bold:** se guardan en `settings`. La secreta va cifrada con AES-256-GCM, con una clave derivada de `ADMIN_SECRET`.
- **Render:** `/`, `/coleccion`, `/reloj/[slug]` y el sitemap pasan a ser dinámicos (`force-dynamic`). La base es la fuente de verdad y no está disponible en `next build` (Docker), así que una página prerenderizada mostraría el seed y no lo editado en el panel. Las mutaciones llaman a `revalidatePath("/", "layout")`.
- **Rutas:** la tienda vive en el route group `(store)` con su chrome. `/admin` usa su propio layout. Las URLs públicas no cambian.

## Consecuencias

- Cada visita a la tienda consulta Mongo (catálogo pequeño, índices por `slug` y `createdAt`). Si el tráfico lo exige, se puede añadir caché con etiquetas e invalidarla desde las mismas acciones.
- Rotar `ADMIN_SECRET` cierra la sesión y obliga a volver a ingresar la llave secreta de Bold.
- Las imágenes huérfanas en Cloudinary no se borran (volumen bajo).
- Bold exige un `callback_url` HTTPS: en local el gateway lo omite y el webhook se prueba con un túnel o en el despliegue.
