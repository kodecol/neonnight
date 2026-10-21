# Neon Night

Tienda de relojería, joyería y perfumería de lujo verificadas (Colombia). Reconstrucción en **Next.js 15** del prototipo hi-fi entregado en `docs/handoff/`, siguiendo la arquitectura y los tokens definidos en ese handoff.

- **Stack:** Next.js 15 (App Router, RSC), React 19, TypeScript strict, Tailwind CSS 4 (`@theme`), Zod, Vitest, Playwright + axe-core.
- **Arquitectura:** clean architecture en cuatro capas con fronteras verificadas por lint (ver `docs/adr/`).
- **Estado:** pasos 1–5 del handoff + SEO base + **panel `/admin`** (catálogo y pagos con Bold) sobre MongoDB y Cloudinary. La analítica sigue siendo un stub.

## Requisitos

- Node 22+ y npm.
- Para e2e: `npm run e2e:install` (descarga Chromium).
- Para Docker y MongoDB local: Docker 24+.

## Comandos

```bash
cp .env.example .env.local      # ajusta NEXT_PUBLIC_SITE_URL, WhatsApp, Mongo y credenciales del admin
npm install
npm run db:up                   # MongoDB local en Docker (puerto 27018)
npm run dev                     # http://localhost:3000 · panel en /admin

npm run typecheck               # tsc --noEmit
npm run lint                    # eslint (incluye fronteras y prohibición de rounded-*)
npm run test                    # Vitest: dominio, casos de uso, infraestructura
MONGODB_TEST_URI=mongodb://localhost:27018 npm test   # + integración contra Mongo real
npm run e2e                     # Playwright: build + start en :3100 + navegación, conversión, axe
npm run check                   # typecheck + lint + test
npm run build && npm start      # producción
```

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `SITE_URL` | URL absoluta del sitio: canonicals, sitemap, OG, JSON-LD, URL de retorno del checkout. En local vale también `NEXT_PUBLIC_SITE_URL` |
| `WHATSAPP_NUMBER` | Número internacional sin `+`. Vacío = enlaces de WhatsApp deshabilitados (**pendiente de definir**) |
| `INSTAGRAM_URL`, `FACEBOOK_URL`, `YOUTUBE_URL` | Perfiles de redes. Por defecto ya son los reales (@neonnight01, neonnightonline, NeonNightsChannel) |
| `TIKTOK_URL` | Vacía = TikTok no aparece |
| `GA_MEASUREMENT_ID` | Google Analytics 4 (`G-XXXXXXX`). Vacía = sin GA. Solo se carga si la persona acepta la analítica |
| `META_PIXEL_ID` | Píxel de Meta (solo dígitos). Vacía = sin píxel. Solo se carga si la persona acepta la publicidad |
| `GOOGLE_SITE_VERIFICATION`, `META_DOMAIN_VERIFICATION` | Códigos de verificación de Search Console y de Meta Business (etiquetas `<meta>`) |
| `MONGODB_URI` | MongoDB (Atlas en producción, `mongodb://localhost:27018` en local). Vacía = repositorios en memoria, sin persistencia |
| `MONGODB_DB` | Nombre de la base (por defecto `neonnight`) |
| `CLOUDINARY_URL` | `cloudinary://key:secret@cloud`. Vacía = fotos en disco local (`.data/uploads`, solo desarrollo) |
| `ADMIN_PASSWORD` | Contraseña inicial del administrador (luego se cambia en `/admin/cuenta`) |
| `ADMIN_SECRET` | 32+ caracteres aleatorios: firma la sesión y cifra la llave secreta de Bold |

Todas se leen **en runtime**: la misma imagen sirve para cualquier dominio y entorno. Los nombres `NEXT_PUBLIC_*` antiguos siguen funcionando como respaldo en desarrollo, pero en producción se usan los de esta tabla (ver `deploy/.env.example`).

## Rutas

| Ruta | Render | Notas |
| --- | --- | --- |
| `/` | dinámica | Hero con video, marquee de marcas (panel › Marcas: visibles y con productos), portadas de las líneas, selección mixta (6 piezas, una línea por turno), banda parallax, garantía, testimonios, "En movimiento", métodos de pago, redes |
| `/coleccion` | dinámica | Toda la colección: pestañas de línea, filtros comunes (marca, precio, disponibilidad) y orden |
| `/coleccion/[linea]` | dinámica, filtros por `searchParams` (`?categoria=`, `?marca=a,b`, `?precio=20000000-60000000`, `?orden=precio-asc`…) | Página indexable de cada línea: chips de categoría y facetas propias de su plantilla, construidas con los productos reales (ADR 0011): rango de precio con tramos sugeridos y campos desde/hasta (sin JS), tamaños y materiales que salen de los datos. Con filtros → `noindex, follow`. `/coleccion?categoria=x` redirige a la línea |
| `/reloj`, `/joya`, `/perfume`, `/producto` + `/[slug]` | dinámica | Detalle según la plantilla: hero, sub-nav sticky, descripción, notas olfativas (perfume), galería, banda, ficha, selector de presentación y cantidad, relacionados. JSON-LD `Product` (`AggregateOffer` con variantes), OG image dinámica |
| `/checkout` | dinámica, sin indexar | Resumen verificado en el servidor, datos del comprador, aceptación de términos y privacidad (versión vigente) y pago: Bold, pedido manual o aviso (ADR 0012) |
| `/gracias` | dinámica | Estado del pedido; con Bold pendiente se refresca sola; en pedido manual, instrucciones y WhatsApp |
| `/nosotros`, `/envios`, `/pagos`, `/garantia`, `/devoluciones`, `/terminos`, `/privacidad` | dinámica | Páginas institucionales y legales (Ley 1480, Ley 1581). Texto en `src/infrastructure/content/pages/`, plazos desde `SITE_CONTENT.policies`. Ver ADR 0006 |
| `/og`, `/og?linea=<slug>` | imagen | Vista previa al compartir (1200 × 630) de la home, la colección, las líneas y las páginas institucionales |
| `/api/checkout/quote` | POST | Resumen del pedido con precios, stock y envío del servidor (no crea nada) |
| `/api/checkout` | POST | Valida datos y consentimiento, recalcula en el servidor, guarda la orden y abre el pago |
| `/api/webhooks/bold` | POST | Notificaciones de Bold con firma verificada |
| `/api/media/[archivo]` | GET | Fotos subidas en desarrollo (sin Cloudinary) |
| `/admin/*` | dinámica, protegida | Panel: `/admin/catalogo`, `/admin/pagos`, `/admin/login` |
| `/sitemap.xml`, `/robots.txt` | generados desde el repositorio | |

Las páginas del catálogo se renderizan por petición porque la base (editable desde el panel) es la fuente de verdad y no está disponible en el build.

## Arquitectura

```
src/
  domain/           Capa 0 — entidades (Product, ProductLine, Order), value objects (Money, Slug, Reference),
                    interfaces de repositorio, reglas puras. Sin dependencias externas.
  application/      Capa 1 — casos de uso (BrowseCatalog, GetProductBySlug, ResolveCart, Checkout),
                    DTOs y puertos (PaymentGateway, Analytics, WhatsAppLinkBuilder, Clock).
  infrastructure/   Capa 2 — repositorios Mongo y en memoria + seed, Bold y Noop (pagos),
                    Cloudinary y disco (fotos), sesión del admin, ConsoleAnalytics,
                    WaMeLinkBuilder, container.ts.
  presentation/     Capa 3 — components/{primitives,blocks,chrome,seo}, hooks, styles, lib.
  app/              Rutas del App Router: (store)/ tienda, admin/ panel, api/. Única capa
                    que llama a getContainer(). src/middleware.ts protege /admin.
tests/unit          Vitest        tests/e2e   Playwright
docs/handoff        Prototipo y README originales      docs/adr   Decisiones
```

**Regla de oro:** `presentation` nunca importa de `infrastructure`. `eslint-plugin-boundaries` lo hace cumplir en `npm run lint`. Las rutas piden el caso de uso al contenedor y pasan DTOs a los componentes.

### Adaptadores

1. **Catálogo:** MongoDB (`src/infrastructure/mongo/`), con respaldo en memoria si no hay `MONGODB_URI`. Ver `src/infrastructure/cms/README.md`.
2. **Pagos:** `BoldPaymentGateway` (API de Links de pago). Con Bold inactivo, el checkout registra un pedido manual (si el panel › Pagos lo permite) o avisa que no hay pagos en línea. Las órdenes, con comprador y consentimiento, se guardan en Mongo.
3. **Analítica:** GA4 y píxel de Meta en el cliente, solo con consentimiento (ADR 0006). El puerto `Analytics` del servidor sigue siendo un registro en consola.

## Panel de administración (`/admin`)

Un solo administrador. La primera vez entra con `ADMIN_PASSWORD`; al cambiarla en **Cuenta** queda guardada con hash (scrypt) en la base y la del entorno deja de aplicar. La sesión es una cookie firmada y `Secure` que dura 7 días (el panel exige HTTPS; en `http://` el login avisa) y lleva una versión: cambiar la contraseña o "cerrar las demás sesiones" invalida las anteriores. El login admite 5 fallos por IP cada 15 minutos (y 50 en total). Secciones:

- **Catálogo:**
  - **Líneas** (Relojería, Joyería, Perfumería…): se crean con nombre y plantilla (`reloj`, `joya`, `perfume` o `general`), con portada y frase para la home. La plantilla decide la ficha técnica y los filtros, y no cambia después (ADR 0005).
  - **Productos:** alta por línea, edición y baja. La marca se elige de la lista de Marcas (o se crea al vuelo). En relojes y joyas, el material de la caja y el metal se eligen además de una lista canónica (para los filtros de la tienda); la lista se sugiere sola a partir del texto de la ficha. Incluyen identidad, ficha según la plantilla, presentaciones con precio y stock, categoría, disponibilidad, condición, destacado y textos.
  - **Fotos:** una sola biblioteca por pieza (se suben varias a la vez). Cada foto se asigna a uno o varios usos: portada, segunda vista, fondo del hero, imagen final y galería (ADR 0007).
  - Categorías agrupadas por línea, editables en línea.
  - Los cambios se publican en la tienda al guardar.
- **Pedidos** (`/admin/pedidos`): lista por estado y detalle con piezas, comprador, entrega y la versión de términos y privacidad aceptada. Los pedidos manuales se marcan como pagados (descuenta stock) o se cancelan; los de Bold cambian solos por el webhook (ADR 0012).
- **Marcas** (`/admin/marcas`): alta, edición y baja de las casas del catálogo, con logo (SVG revisado o PNG, WebP o AVIF con fondo transparente; la proporción se calcula sola), modo en reposo (silueta blanca o escala de grises), color de marca para el hover, líneas y visibilidad en el marquee. El orden de la lista es el del marquee de la home, que solo muestra las marcas visibles con productos. Renombrar una marca actualiza sus productos; no se puede borrar una marca con productos. También se editan el rótulo y el aviso de revendedor independiente del marquee (ADR 0010).
- **Inicio** (`/admin/inicio`): biblioteca de medios del sitio (fotos por el servidor; videos directo a Cloudinary con firma, hasta 100 MB) y contenido de la home: hero (pieza destacada o foto o video propio con antetítulo, título, texto y botón) banda (foto, frase y encuadre), los tres compromisos de "Garantía y autenticidad", los testimonios (solo se publican los visibles con autorización escrita del cliente) y las redes (activar, usuario y enlace). Además, el orden y la visibilidad de los bloques. Lo vacío o nunca editado usa los textos del código. "Vista previa" guarda un borrador y lo muestra en `/admin/vista-previa` (solo con sesión); "Publicar" lo lleva a la tienda, y las últimas 10 publicaciones se pueden volver a cargar (ADR 0008).
- **Legales** (`/admin/legales`): las siete páginas institucionales y legales en un markdown sencillo, con fichas para los datos de la empresa (`{correo}`, `{empresa}`, `{transportadora}`…), revisión en vivo, vista previa del borrador, publicación con versión y fecha de vigencia automáticas e historial de 10 versiones. Además, los datos de la empresa (identidad, correos, horario) y la transportadora con su página de rastreo (ADR 0009).
- **Pagos:**
  - Configuración de Bold: activar el cobro, elegir ambiente (pruebas o producción) e ingresar la llave de identidad y la llave secreta (se guarda cifrada).
  - Muestra la URL del webhook para registrarla en Bold.
  - **Sin pasarela:** con Bold inactivo, recibir el pedido y coordinar el pago (instrucciones editables que el cliente ve al confirmar) o desactivarlo para que el checkout avise que no hay pagos en línea.
- **Cuenta** (`/admin/cuenta`): cambiar la contraseña (actual, nueva de 12 caracteres o más y confirmación) y cerrar las sesiones abiertas en otros dispositivos. Si se pierde la contraseña, desde una máquina con acceso a la base: `printf '%s' "$NUEVA" | MONGODB_URI=… npm run admin:reset-password` (o sin `printf` la pide sin eco). Con `-- --usar-entorno` vuelve a regir `ADMIN_PASSWORD`. Ambos cierran todas las sesiones.

### Puesta en marcha con servicios reales

1. **MongoDB Atlas:** crear un cluster M0, un usuario de base de datos y permitir la IP del servidor. Copiar la cadena `mongodb+srv://…` en `MONGODB_URI`. La primera conexión siembra el catálogo.
2. **Cloudinary:** copiar el *API environment variable* (`cloudinary://…`) del dashboard en `CLOUDINARY_URL`.
3. **Admin:** definir `ADMIN_PASSWORD` (contraseña inicial: cámbiala en `/admin/cuenta` al primer ingreso) y un `ADMIN_SECRET` aleatorio. Para generarlo: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
4. **Bold:**
   1. En el panel de Bold, copiar las llaves de identidad y secreta del ambiente.
   2. En *Webhooks*, registrar `https://<dominio>/api/webhooks/bold` para ventas aprobadas y rechazadas.
   3. En `/admin/pagos`, guardar las llaves y activar el cobro.
   4. Probar primero en **Pruebas**.
   5. Bold exige HTTPS para el retorno del checkout, así que en local se usa un túnel (ngrok o cloudflared).

## Contenido centralizado

Todo el contenido editorial (copys, menú, footer, secciones de la home, filtros, textos de la bolsa, plantillas de WhatsApp y redes sociales) vive en **un solo archivo**: `src/infrastructure/content/site-content.ts`, tipado por `SiteContent` (`src/application/dto/site-content.dto.ts`). Los componentes no contienen textos fijos: reciben el contenido por props desde las rutas, que lo piden al contenedor a través del puerto `SiteContentRepository`.

- Cambiar un copy, una red social o un enlace del footer = editar ese archivo.
- Las plantillas usan `{clave}` (`{brand}`, `{count}`, `{year}`, `{items}`, `{total}`) y se resuelven con `fill()` de `src/application/lib/template.ts`.
- Cuando exista CMS, se implementa `SiteContentRepository` sobre él y se registra en `container.ts`; nada más cambia.
- El catálogo de producto no está en este archivo: vive en la base y se edita en `/admin`. El seed inicial está en `src/infrastructure/cms/seed.ts`. Los chips de categoría de `/coleccion` salen de las categorías del panel; en `collection.filters` quedan solo "Todas" y los filtros de precio.

## Diseño y tokens

Todos los tokens están en `src/presentation/styles/globals.css` (`@theme`). Radio 0 y sin sombras en todo el sistema; `rounded-*` está prohibido por lint. Escritorio es fiel al píxel al handoff (padding 56 px, display 88 px, grillas 3/4 col). Tablet (≥768) y móvil son criterio propio: 32/20 px de padding, display 64/44 px, grillas 2/1 col. Parallax y video del hero se desactivan en móvil y bajo `prefers-reduced-motion`; la pantalla de carga se desmonta del DOM, no se renderiza con reduced motion y aparece una vez por sesión.

### Accesibilidad — excepciones conocidas

El diseño hi-fi fija dos combinaciones que no alcanzan 4.5:1: label blanco sobre magenta `#FF006E` (≈3.6:1) y gris terciario `#515151` sobre negro (≈2.4:1). El chequeo axe de e2e las excluye (`.bg-accent`, `.text-ink-3`) hasta que diseño defina la alternativa. El resto de la página pasa WCAG 2.1 AA sin violaciones serias.

## Rendimiento

Build actual: JS inicial ≈113 kB (presupuesto 120 kB). Imágenes vía `next/image` con AVIF/WebP y alto reservado con `aspect-ratio`. **Pendiente:** transcodificar `public/assets/hero-day-date.mp4` (12 MB) y `vertical-daytona.mp4` (13 MB) a H.264/AV1 por debajo de 3 MB; los posters (`*-poster.jpg`) ya se generaron con ffmpeg y se sirven en móvil.

## Contribuir

Ramas, commits con **gitmoji**, pull requests, CI, versiones y configuración del repositorio: **[`docs/GITHUB.md`](docs/GITHUB.md)**. Resumen en [`CONTRIBUTING.md`](CONTRIBUTING.md); vulnerabilidades en [`SECURITY.md`](SECURITY.md).

## Despliegue

Producción corre aislada en un VPS compartido, con límites de 1 CPU y 512 MB, y se publica con nginx-proxy-manager en `https://neonightonline.com`. La base de datos está en MongoDB Atlas y las fotos en Cloudinary. Cada push a `main` se despliega solo con GitHub Actions.

La guía completa está en **[`docs/DEPLOY.md`](docs/DEPLOY.md)**: infraestructura, primera instalación, despliegue de cada versión, rollback, dominio y operación.

## Pendientes de contenido (handoff §7)

- Las 8 referencias son modelos reales (Rolex Sky-Dweller 326938, Rolex Daytona 126500LN, Tudor BB58, Rolex GMT-Master II 126710BLNR, Rolex Datejust 36, Omega Speedmaster sapphire, Cartier Santos Large, Omega Seamaster 300M) con specs de catálogo, pero las **fotos son de un retailer externo recortadas a PNG solo para el mockup**. Sustituir por fotografía propia del inventario.
- Lo mismo aplica a las piezas añadidas con el catálogo multilínea: 4 relojes, 8 joyas y 10 perfumes. Sus fotos (`public/assets/products/`) son packshots de catálogo de las casas o de retailers autorizados, recortados a fondo transparente **solo para el mockup**. Las portadas de línea (`public/assets/lines/`) siguen la misma regla.
- Precios orientativos en COP (convertidos del precio público en EE. UU. o del mercado de segunda mano), no confirmados. Stock de ejemplo.
- Textos descriptivos redactados como placeholder informado; revisar con el equipo comercial.
- Número de WhatsApp.
- Propietario del establecimiento y su NIT (`company.owner` en `site-content.ts`): la política de datos lo nombra como responsable cuando existe.
- Crear el buzón `contacto@neonightonline.com` (es el canal legal de reclamos y de datos personales) o cambiar `company.email`.
- IDs de Google Analytics 4 y del píxel de Meta (`GA_MEASUREMENT_ID`, `META_PIXEL_ID`).
- Revisión de las páginas legales por un abogado antes del lanzamiento.
- Imagen final (foto de ambiente) de Cartier Juste un Clou y Tom Ford Oud Wood: no se encontró una foto de la pieza exacta; se sube desde el panel (Catálogo › pieza › Fotos › Imagen final).
- **Testimonios:** los 4 actuales (`home.testimonials` en `site-content.ts`) son textos de **ejemplo**. Antes de publicar hay que reemplazarlos por testimonios reales, con autorización escrita de cada cliente (se hace en el panel › Inicio › Testimonios). Publicar comentarios inventados como reales es publicidad engañosa (Ley 1480, Estatuto del Consumidor). Por eso no se emiten datos estructurados de reseñas.
- **Métodos de pago:** confirmar en el panel de Bold qué medios tiene habilitados el comercio y ajustar `home.payments.logos`. En especial **Daviplata**: no hay logo oficial descargable (el sitio está protegido), así que hoy se muestra como texto. Pedir el arte a Bold o Davivienda y guardarlo en `public/assets/logos/payments/`.
- Video vertical nativo para "En movimiento" (el actual es un recorte horizontal).

## Créditos de imágenes y logos

- **Banda de la home** (`public/assets/band-perfume.jpg`): foto de Puscas Adryan en [Unsplash](https://unsplash.com/photos/77k9-nfxmhs), con Unsplash License (uso comercial sin atribución obligatoria).
- **Logos de medios de pago** (`public/assets/logos/payments/`): Visa, Mastercard y American Express salen de los trazados de [Simple Icons](https://simpleicons.org) con su color oficial. PSE viene del sitio de ACH Colombia, Nequi y Bancolombia de Wikimedia Commons, y Bold de bold.co. Se usan para indicar que esos medios se aceptan.
- **Logos de relojeras** (`public/assets/logos/brands/`): Rolex, Omega, Cartier, Tudor y Grand Seiko, de Wikimedia Commons. Ver la nota legal: hay que validar su uso con un abogado de marcas antes de publicar.
- **Favicon e íconos** (`src/app/favicon.ico`, `icon.png`, `apple-icon.png`): se generan desde `public/assets/isotipo-color.png` con `node scripts/generate-icons.mjs`.

## Nota legal (handoff §8)

El prototipo nombra "Rolex" y usa material de esa marca como referencia. Las fotos de producto de las 8 referencias (`public/assets/ref0X-*.png`) y las de `public/assets/products/` y `public/assets/lines/` provienen de catálogos de terceros y se recortaron únicamente para este mockup: **no tienen licencia para producción**. Antes de publicar hay que usar fotografía y video propios de las piezas en inventario y evitar cualquier tratamiento que sugiera afiliación oficial.

El marquee "Las casas que trabajamos" usa los **logotipos oficiales** de las relojeras. Para un revendedor independiente, nombrar la marca para describir lo que vende suele ser aceptable; usar el logotipo es más delicado. Rolex, en particular, persigue el uso de su marca por vendedores no autorizados. El sitio muestra el aviso "no está afiliado a las marcas mencionadas", pero la decisión de publicar los logos debe validarla un abogado de propiedad intelectual. Los logos se administran en el panel › Marcas: si se quita el logo de una marca, el marquee la muestra como texto. Cualquier logo nuevo (de joyería o perfumería) entra en la misma regla: **validar su uso con un abogado de propiedad intelectual antes de publicarlo**.
