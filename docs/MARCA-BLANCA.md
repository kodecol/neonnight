# Marca blanca: plantilla `jewelry-store`

Este repo es la plantilla **`jewelry-store`** de Kodecol: una tienda de relojes, joyas y perfumes con panel de administración, que la plataforma **Kode** instala una vez por cliente. Neon Night es una instancia más de la plantilla: su marca vive en `brands/neonnight/brand.json`.

Decisión de fondo en el ADR 0017.

## El contrato con Kode

| Archivo | Qué es |
| --- | --- |
| `template.manifest.json` | Nombre, versión (igual a `package.json`), `schema_version`, puerto, health, variables de entorno (`required` y `secret`), servicios y comandos del ciclo de vida |
| `brand.schema.json` | JSON Schema 2020-12 del `brand.json`. **Se genera** desde `BrandConfigSchema` (`src/application/dto/brand-config.dto.ts`) con `npm run brand:schema`, y un test exige que esté al día |
| `examples/brand.example.json` | Una marca ficticia válida ("Aurora Joyería") |
| `brands/<slug>/brand.json` | Marcas reales que viven en el repo (hoy solo Neon Night) |

Una sola imagen sirve a todas las tiendas: nada de marca se decide en el build. Lo propio de cada instancia llega por variables de entorno (`STORE_SLUG`, `MONGODB_DB`, `SITE_URL`…) o queda en su base, escrito por `brand:apply` y editable después desde el panel.

## Ciclo de vida

Va dentro de la imagen como `/app/lifecycle.mjs`. Lo genera esbuild desde `src/cli/lifecycle.ts` (`npm run build:lifecycle`). Corre sin el servidor y escribe una línea JSON en stdout. Los códigos de salida son:

- 0: salió bien.
- 1: falló la validación o la operación.
- 2: el uso es incorrecto.

```bash
node lifecycle.mjs info                                   # plantilla, versión de esquema y nichos
node lifecycle.mjs migrate                                # migraciones pendientes (meta/schema)
node lifecycle.mjs brand:apply --file brand.json [--force]
node lifecycle.mjs seed --niche joyeria [--force]         # relojeria|joyeria|perfumeria|ecommerce|vacio
```

- **`migrate`** aplica en orden las migraciones de `src/infrastructure/mongo/migrations.ts` y guarda la versión en `meta/{_id:"schema"}`. El servidor también las aplica al conectar.
  - Cada migración es idempotente.
  - Para agregar una, se suma al final de la lista; nunca se edita una vieja.
- **`brand:apply`** valida el archivo y publica, como cualquier publicación del panel (con historial):
  - Identidad: nombre, wordmark, frase, título para buscadores, descripción, isotipo y logo.
  - Apariencia: la paleta se completa desde el acento y el fondo; se exige contraste AA y tema oscuro.
  - Legales › Datos de la empresa.
  - Inicio › Redes.
  - Las imágenes https se **descargan una sola vez** (5 s, 3 MB, PNG, WebP, AVIF o SVG revisado) y se guardan como medios de la instancia. Las rutas `/assets/…` se usan tal cual.
  - Guarda una huella del archivo: aplicar el mismo archivo otra vez no cambia nada.
- **`seed`** siembra un catálogo de demo neutro desde `src/infrastructure/cms/demo/`, con casas y productos ficticios, ids `demo-…` e imágenes en `public/assets/demo/`.
  - Solo inserta lo que falta.
  - Se niega a sembrar si la tienda ya tiene productos propios, salvo con `--force`.
  - El servidor **ya no siembra solo**: una base nueva arranca vacía.

## Variables de una instancia

Las obligatorias son:

- `STORE_SLUG`
- `SITE_URL`
- `MONGODB_URI`
- `MONGODB_DB`: ahora es obligatoria; ya no hay default.
- `ADMIN_PASSWORD`
- `ADMIN_SECRET`

El resto, con su descripción, está en el manifiesto. Las que más importan:

- `STORE_SLUG` define:
  - las claves del navegador: `<slug>.cart.v2` y `<slug>.consent.v1`;
  - las carpetas de Cloudinary: `<slug>/catalogo` y `<slug>/sitio`;
  - el `data-store` del `<html>`.
- `STORE_ORDER_PREFIX` es opcional (1 a 4 letras). Es el prefijo del número de pedido; sin él, se usan las iniciales del slug ("aurora-joyeria" → `AJ-…`).
- `MEDIA_DIR` es la carpeta de fotos cuando no hay Cloudinary (en la imagen, `/data/media`, montada como volumen). Sin Cloudinary no hay subida de video.
- `CHECKOUT_RATE_LIMIT` es la cantidad de pedidos por minuto y por IP (10 por defecto).

## Imagen

```bash
docker build -t kodecol/jewelry-store:<versión> --build-arg BUILD_SHA=$(git rev-parse --short=7 HEAD) .
```

- Corre con la raíz de solo lectura, el usuario `nextjs` y estos volúmenes: `/app/.next/cache` y `/data/media`.
- Memoria medida (1 vCPU, sin Cloudinary): unos 106 MiB en reposo y unos 151 MiB tras 2.600 peticiones con 20 en paralelo. El manifiesto pide 320 MB.
- Si el build falla al descargar Google Fonts, se reintenta.
- `/api/health` devuelve `{status, sha, version, template:{name, version}, schema_version, db}`.

## Nueva versión de la plantilla

1. Si cambió la base, agrega la migración y sube `SCHEMA_VERSION` (es automático: es la última de la lista).
2. Sube `version` en `package.json`, en `template.manifest.json` y en `src/application/lib/template-info.ts`. Un test exige que coincidan.
3. Si cambió `BrandConfigSchema`, corre `npm run brand:schema`. Los cambios deben ser compatibles: campos nuevos opcionales.
4. Construye la imagen con la versión nueva. Kode actualiza cada instancia (migrate y brand:apply) sin volver a sembrar.

**Nunca reuses una etiqueta.** Cada imagen distinta lleva su propia versión (1.0.1, 1.1.0…). Kode registra qué versión corre cada cliente, así que dos imágenes con la misma etiqueta no se pueden distinguir.

## Lo neutro y lo de cada tienda

Sin nada publicado, la plantilla se ve así:

- se llama "Tu tienda";
- usa un isotipo geométrico (`scripts/generate-neutral-brand.mjs`);
- tiene datos de empresa de ejemplo;
- no muestra redes ni testimonios: sus bloques no aparecen hasta que haya redes, o testimonios reales y autorizados.

Todo lo de una marca real va en su `brand.json` o se edita en el panel.

## Demo host (`TENANCY=multi`, desde 1.1.0)

La misma imagen puede servir **muchas demos** en un solo proceso. Es el modo del servidor de demos de Kode: cada demo es `<slug>.<DEMO_ZONE>`, con un solo nivel de subdominio.

- **Resolución:** cada petición busca su demo por el host en `demo_registry.tenants`, con una caché de 30 s.
  - Un host desconocido da 404, sin consultar la base si no es de la zona.
  - Una demo vencida da 404 con «Esta demo terminó».
  - `/api/health` responde en cualquier host.
- **Aislamiento:** cada demo tiene:
  - su base (`demo_<slug con _>`) sobre una sola conexión compartida;
  - su URL;
  - su clave de sesión, derivada de `DEMO_MASTER_SECRET` con HKDF: la cookie de una demo no abre otra;
  - sus medios en Cloudinary, bajo `demos/<slug>/`.
- **Modo demo:**
  - Bold siempre apagado, sin llaves ni webhooks: los pedidos son manuales, con el prefijo `DEMO-`;
  - sin analítica;
  - `noindex`, `robots.txt` con `Disallow: /` y sin sitemap;
  - freno de 240 peticiones por minuto por IP y host, y 1.200 por host.
- **Contrato con Kode:** `/api/_kode/tenants` (GET) y `/api/_kode/tenants/:slug` (PUT y DELETE), con firma HMAC: ver `template.manifest.json` › `multi` y la §11 del plan en `kodecol/kode`.
  - **PUT** crea o actualiza la demo. Al crear exige `admin_password` y siembra el nicho; siempre aplica `brand:apply`, que es idempotente.
  - **DELETE** borra la base (o sus colecciones, si el usuario no tiene `dbAdmin`), solo `demos/<slug>/` en Cloudinary, y el registro.
- **El modo single no cambia:** Neon Night y cualquier instancia propia siguen igual, con todo del entorno.

Pendiente, para versiones siguientes:
- franja «Demo de Kodecol»;
- cuota de medios por demo;
- caché de datos por demo;
- tope de páginas renderizándose a la vez;
- exportar y convertir una demo en instancia;
- CLI por `docker exec`;
- medios y reenlace para importar demos con datos.
