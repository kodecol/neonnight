# Neon Night — Handoff de implementación

## 1. Qué es este paquete

Este bundle contiene el **prototipo de diseño en HTML** de la tienda Neon Night (venta de relojes de lujo verificados). No es código de producción y no debe copiarse tal cual: es la referencia visual y de comportamiento que hay que **reconstruir en Next.js** siguiendo la arquitectura descrita abajo.

Fidelidad: **alta (hi-fi)**. Colores, tipografía, espaciado, transiciones y copys son finales. La implementación debe ser fiel al píxel.

### Contenido

| Archivo | Qué es |
| --- | --- |
| `Neon Night.dc.html` | Prototipo completo: home, colección y detalle de producto en un solo archivo |
| `support.js`, `image-slot.js` | Runtime del prototipo. **No portar** — son andamiaje de la herramienta de diseño |
| `assets/` | Logo, videos y fotos de producto listos para usar en producción |
| `_ds/` | Design system Modernist: `styles.css` con los tokens y `_ds_bundle.js` con los componentes |

Para ver el prototipo: abrir `Neon Night.dc.html` en un navegador (requiere servidor local, p. ej. `npx serve .`).

---

## 2. Las tres vistas

En el prototipo las tres vistas viven en un solo archivo y se conmutan con estado (`view: 'home' | 'collection' | 'product'`). **En producción son tres rutas reales**, no estado de cliente: el SEO y el compartir enlaces dependen de ello.

### 2.1 Home — `/`

De arriba abajo:

1. **Pantalla de carga.** Overlay negro a pantalla completa, z-index máximo. Barra de 3px blanca que crece de 0% a 100% en 1,6s (`cubic-bezier(.4,0,.2,1)`) pegada al borde superior. Al centro: isotipo a 64px (invertido a blanco, opacidad .9) y debajo el wordmark "NEON NIGHT" a 13px/600, letter-spacing animado de .8em a .34em. A los 1,7s el overlay hace fade-out y se retira del flujo. En producción debe desmontarse del DOM, no solo ocultarse, y respetar `prefers-reduced-motion`.
2. **Hero.** 100vh. Video de fondo (`assets/hero-day-date.mp4`) en `object-fit: cover` con parallax factor 0.12. Overlay: gradiente vertical de `rgba(0,0,0,.85)` abajo a `rgba(0,0,0,.15)` al 55% y `rgba(0,0,0,.5)` arriba. Contenido alineado abajo-izquierda con padding `0 56px 88px`: kicker "Rolex · Nueva referencia" (14px/400, tracking .18em, mayúsculas), H1 "Day-Date 36" (88px/88px, tracking -2px, peso 500, mayúsculas), tagline a 22px/32px peso 200, y dos CTAs. Indicador de scroll: círculo de 44px con borde `hsla(0,0%,59%,.5)` y chevron, centrado a 34px del fondo.
3. **Encabezado de catálogo.** Padding `120px 56px 40px`, borde inferior de 1px. Kicker "Catálogo" + H2 a 44px/48px con la propuesta de valor. A la derecha, enlace "VER LAS 8 REFERENCIAS" con subrayado magenta.
4. **Grilla de producto.** 3 columnas, gap `64px 40px`. Cada tarjeta: imagen cuadrada con **hover swap** (frontal → trasera, crossfade de opacidad .5s), nombre 22px/500 mayúsculas, subtítulo 16px/200 en gris, precio 16px, y dos acciones: "AÑADIR A LA BOLSA" (fondo magenta, flex:1) y "WHATSAPP" (borde gris).
5. **Banda parallax.** 78vh, imagen full-width con factor 0.18, overlay negro al 40%, H2 a 44px superpuesto a la izquierda.
6. **Garantía y autenticidad.** 3 columnas. Cada una con borde superior de 2px (la tercera en magenta), número "01"/"02"/"03" a 36px, título 22px mayúsculas y párrafo 18px/26px en gris. Copys: verificación en mano, garantía de 24 meses, devolución en 10 días.
7. **En movimiento.** 2 columnas. Izquierda: texto + enlace "PEDIR EL VIDEO DE UNA PIEZA". Derecha: video vertical en `aspect-ratio: 540/676`, máximo 420px de ancho.
8. **Instagram.** Grilla de 4 cuadrados con gap 16px, encabezado "@neonnight" con borde inferior.
9. **Footer.** 4 columnas (marca + comprar + confianza + contacto) y barra legal separada por rule de 1px.

### 2.2 Colección — `/coleccion`

Breadcrumb, H1 "Colección" a 88px, fila de filtros como chips cuadrados (activo: borde blanco; inactivo: borde `hsla(0,0%,59%,.4)` y texto gris), y grilla de **4 columnas** con imágenes en `aspect-ratio: 4/5` y el mismo hover swap. Los filtros del prototipo son visuales; en producción deben ser server-side por searchParams.

### 2.3 Detalle de producto — `/reloj/[slug]`

Hero 100vh con el nombre y el precio, **sub-nav sticky** a `top: 72px` (60px de alto, fondo `rgba(0,0,0,.7)` con blur, pestaña activa con borde inferior magenta de 2px), bloque de descripción a 2 columnas, galería de dos imágenes desfasadas con parallax opuesto (+0.06 / -0.06), banda full-width de 80vh, tabla de especificaciones en 2 columnas con rules de 1px, y bloque de cierre con precio + "AÑADIR A LA BOLSA" + "HABLAR POR WHATSAPP".

---

## 3. Chrome global

**Header.** Fijo, 72px, padding `0 56px`, z-index 51, `backdrop-filter: blur(6px)`. Transparente en `scrollY <= 40`; a partir de ahí `rgba(0,0,0,.7)` con transición de .4s. Izquierda: botón "MENÚ" con dos barras de 2px. Centro absoluto: isotipo 26px + wordmark con tracking .3em. Derecha: "COLECCIÓN", indicador de divisa "COP" y "BOLSA" con contador en cuadro magenta de 20px.

**Menú lateral.** Overlay `rgba(0,0,0,.5)` con blur de 10px; panel de 41.7vw (máx 640px) con fondo `rgba(0,0,0,.72)`, borde derecho de 1px y enlaces a 36px/500 mayúsculas. Al pie: contacto en gris y nota de envíos.

**Bolsa.** Drawer derecho de 480px, fondo `#0A0A0A`, borde izquierdo de 1px. Líneas separadas por rules, total, CTA magenta "FINALIZAR COMPRA" y salida secundaria "O CERRAR POR WHATSAPP".

**Animación de entrada.** Todo bloque con `data-reveal` sube 28px y aparece con `opacity/transform` en .9s `cubic-bezier(.215,.61,.355,1)`, disparado por IntersectionObserver con `rootMargin: '0px 0px -6% 0px'`. Importante: el efecto es **mejora progresiva** — el contenido parte visible y solo se oculta si el observador está activo, con un fallback que lo destapa a los 1,4s. Replicar esa garantía; nunca dejar contenido dependiente de JS para ser visible.

**Parallax.** Un único listener de scroll pasivo recorre los elementos `[data-parallax]`, descarta los que están a más de 400px del viewport y aplica `translate3d(0, (centroDelElemento - centroDelViewport) * factor, 0)`. En producción: envolver en `requestAnimationFrame`, desactivar bajo `prefers-reduced-motion` y no aplicarlo en móvil.

---

## 4. Tokens

Los tokens del design system Modernist viven en `_ds/modernist-*/styles.css`. La tienda los consume sobre **fondo negro**, así que la superficie se invierte respecto al default del sistema.

### Color

| Rol | Valor | Uso |
| --- | --- | --- |
| Fondo | `#000000` | Ground de toda la página |
| Superficie | `#0E0E0E` | Fondo de imágenes y contenedores de media |
| Superficie elevada | `#0A0A0A` | Drawer de la bolsa |
| Tinta | `#FFFFFF` | Títulos y texto primario |
| Tinta secundaria | `#A1A1A1` | Párrafos, subtítulos, enlaces de footer |
| Tinta terciaria | `#515151` | Labels de footer, notas legales |
| Acento | `#FF006E` | CTAs, contador de bolsa, subrayados, pestaña activa |
| Divisor | `hsla(0,0%,59%,.3)` | Rules de 1px entre secciones |
| Borde | `hsla(0,0%,59%,.4-.5)` | Botones secundarios y chips inactivos |

Radio: **0px en todo**, sin excepción. Sin sombras: la jerarquía la dan los rules y el contraste.

### Tipografía

Archivo en todos los pesos usados (200, 400, 500, 600).

| Rol | Tamaño / línea | Peso | Tracking | Caso |
| --- | --- | --- | --- | --- |
| Display | 88 / 88 | 500 | -2px | Mayúsculas |
| H2 | 44 / 48 | 500 | -1px | Mayúsculas |
| H3 / nombre de producto | 22 / 24 | 500 | — | Mayúsculas |
| Lead | 22 / 32 | 200 | .2px | Normal |
| Cuerpo | 18 / 26 | 200 | — | Normal |
| Meta | 16 / 24 | 200 | — | Normal |
| Kicker | 14 | 400 | .18em | Mayúsculas |
| Label / botón | 12–13 | 600 | .14–.16em | Mayúsculas |

Regla: peso 200 para prosa, 500 para títulos, 600 solo para labels en mayúsculas con tracking amplio. Nunca peso 200 por debajo de 16px.

### Espaciado

Padding horizontal de página: **56px**. Padding vertical de sección: **120px** (64px cuando la sección continúa la anterior). Gaps de grilla: 40px (3 col), 32px (4 col), 16px (Instagram).

---

## 5. Arquitectura objetivo

### 5.1 Stack

- **Next.js 15** con App Router y React Server Components.
- **TypeScript** en modo estricto.
- **Tailwind CSS 4** con los tokens de arriba mapeados a `@theme` en el CSS, no en `tailwind.config`.
- **Zod** para validación de datos entrantes en el borde de la aplicación.
- **Vitest** para unidad, **Playwright** para e2e.

Corner radius: mapear `--radius-*` a `0px` y no usar utilidades `rounded-*`. Prohibirlas con una regla de lint es la forma fiable de que el sistema no se erosione.

### 5.2 Clean architecture

Cuatro capas, dependencias apuntando siempre hacia dentro. El dominio no importa nada de fuera.

\`\`\`
src/
  domain/                    # Capa 0 — sin dependencias externas
    entities/                # Watch, Brand, CartLine, Order
    value-objects/           # Money, Reference, Slug
    repositories/            # Interfaces: WatchRepository, OrderRepository
    services/                # Reglas puras: pricing, disponibilidad
  application/               # Capa 1 — casos de uso
    use-cases/               # ListWatches, GetWatchBySlug, AddToCart, Checkout
    dto/                     # Formas de entrada/salida de los casos de uso
    ports/                   # Interfaces de salida: PaymentGateway, Analytics
  infrastructure/            # Capa 2 — implementaciones
    repositories/            # Adaptadores sobre el CMS o la base de datos
    cms/                     # Cliente del CMS + mappers a entidades de dominio
    payments/                # Pasarela (Wompi, Mercado Pago, Stripe)
    whatsapp/                # Construcción de deep links wa.me
    container.ts             # Registro de dependencias
  presentation/              # Capa 3 — React
    app/                     # Rutas del App Router
    components/
      primitives/            # Button, Tag, Rule, Field — envuelven el DS
      blocks/                # Hero, ProductGrid, ParallaxBand, SpecTable
      chrome/                # Header, SideMenu, CartDrawer, LoadingScreen
    hooks/                   # useParallax, useReveal, useCart
\`\`\`

**Regla de oro:** un componente de `presentation` nunca importa de `infrastructure`. Pide un caso de uso al contenedor y recibe DTOs. Hacer cumplir la frontera con `eslint-plugin-boundaries` o `dependency-cruiser` en CI — sin eso, la separación se degrada en semanas.

### 5.3 Inyección de dependencias

No hace falta un framework de DI. Un contenedor tipado y explícito es suficiente y funciona igual en server components, route handlers y tests:

\`\`\`ts
// infrastructure/container.ts
import type { WatchRepository, OrderRepository } from '@/domain/repositories';

export interface Container {
  watches: WatchRepository;
  orders: OrderRepository;
}

let container: Container | null = null;

export function createContainer(overrides: Partial<Container> = {}): Container {
  return {
    watches: overrides.watches ?? new CmsWatchRepository(cmsClient),
    orders: overrides.orders ?? new SqlOrderRepository(db),
  };
}

export function getContainer(): Container {
  return (container ??= createContainer());
}
\`\`\`

Los casos de uso reciben sus dependencias por constructor, nunca las importan:

\`\`\`ts
// application/use-cases/get-watch-by-slug.ts
export class GetWatchBySlug {
  constructor(private readonly watches: WatchRepository) {}

  async execute(slug: string): Promise<WatchDetailDto> {
    const watch = await this.watches.findBySlug(slug);
    if (!watch) throw new WatchNotFoundError(slug);
    return toWatchDetailDto(watch);
  }
}
\`\`\`

En un server component: `const watch = await new GetWatchBySlug(getContainer().watches).execute(slug)`. En un test: `createContainer({ watches: new InMemoryWatchRepository([...]) })`. Sin mocks de módulos y sin red.

### 5.4 Estructura de rutas

\`\`\`
app/
  layout.tsx                 # Header, footer, fuentes, metadata base
  page.tsx                   # Home (server, ISR)
  coleccion/page.tsx         # Grilla + filtros por searchParams (server)
  reloj/[slug]/page.tsx      # Detalle (generateStaticParams + ISR)
  api/checkout/route.ts      # Route handler del checkout
  sitemap.ts  robots.ts      # Generados desde el repositorio
\`\`\`

Server components por defecto. Solo estos son `'use client'`: `CartDrawer`, `SideMenu`, `LoadingScreen`, el hover swap de las tarjetas y los hooks de parallax/reveal. Todo el contenido y todos los precios se renderizan en el servidor.

Estado de la bolsa: un provider de cliente con persistencia en `localStorage`, hidratado con cuidado para no romper el SSR. El precio autoritativo se recalcula en el servidor al hacer checkout — nunca confiar en el importe que llega del cliente.

### 5.5 Modelo de datos

\`\`\`ts
// domain/entities/watch.ts
export interface Watch {
  readonly id: WatchId;
  readonly slug: Slug;
  readonly brand: string;          // "Rolex"
  readonly model: string;          // "Day-Date 36"
  readonly reference: string;      // "128238"
  readonly price: Money;           // { amount: number; currency: 'COP' }
  readonly condition: 'nuevo' | 'como-nuevo' | 'excelente';
  readonly specs: WatchSpecs;      // movimiento, caja, cristal, hermeticidad
  readonly media: WatchMedia;      // front, back, gallery[], video?
  readonly includes: string[];     // "Caja y papeles"
  readonly availability: 'disponible' | 'reservado' | 'vendido';
}
\`\`\`

`Money` es un value object con enteros en centavos y formateo vía `Intl.NumberFormat('es-CO')`. **Nunca floats para dinero.** El formato del prototipo es `$ 12.900.000 COP`.

### 5.6 SEO

- **Metadata por ruta** con `generateMetadata`: título `{Marca} {Modelo} — Neon Night`, descripción con referencia y precio, OG image por producto vía `opengraph-image.tsx` (generación dinámica con `ImageResponse`).
- **JSON-LD** en cada detalle: `Product` con `offers` (precio, moneda COP, `availability`), `brand`, `sku`. En la home, `Organization` + `WebSite`. En colección, `BreadcrumbList` y `ItemList`.
- **Sitemap y robots dinámicos** desde el repositorio de productos, con `lastModified` real.
- **Canonicals** absolutas; los filtros de colección con `noindex, follow` salvo las combinaciones con demanda de búsqueda, que deberían ser rutas propias.
- **Semántica:** un solo `h1` por página, jerarquía de encabezados sin saltos, `alt` descriptivo en cada foto de producto (marca + modelo + vista), `aria-label` en los botones de icono.
- La pantalla de carga **no debe retrasar el LCP ni ocultar contenido a los rastreadores**: el HTML va completo desde el servidor y el overlay es puramente decorativo encima.

### 5.7 Rendimiento

- **Imágenes:** `next/image` con AVIF y WebP, `sizes` correcto por breakpoint, `priority` solo en el hero, `placeholder="blur"` en la grilla. Las fotos de producto son PNG con transparencia: conservar el canal alfa.
- **Video del hero:** transcodificar a H.264 y AV1, `preload="metadata"`, `poster` obligatorio, `muted playsInline loop`, y **no cargarlo en móvil ni bajo `prefers-reduced-motion`** — servir el poster. El archivo de referencia son 13 MB; el objetivo de producción es menos de 3 MB con un poster que cubra el primer frame. Llamar a `.play()` con `.catch()` tras montar: los atributos de autoplay no bastan en todos los navegadores.
- **Fuentes:** `next/font` con `display: swap` y subsetting latin; solo los pesos 200/400/500/600.
- **Caché:** ISR con revalidate por ruta y `revalidateTag` desde los webhooks del CMS. La colección y los detalles son estáticos; solo el carrito y el checkout son dinámicos.
- **Presupuesto:** LCP menor a 2,5s en 4G, CLS por debajo de 0,1 (reservar el alto de todo contenedor de media con `aspect-ratio`), menos de 120 KB de JS inicial. Medir con Lighthouse CI en cada PR.

### 5.8 Conversión

Dos caminos, ambos presentes en el prototipo:

1. **Carrito propio.** Añadir a la bolsa → drawer → checkout server-side. Validar precio y disponibilidad en el servidor antes de cobrar. Pasarela local (Wompi o Mercado Pago) detrás del port `PaymentGateway`, para poder cambiarla sin tocar el dominio.
2. **WhatsApp por producto.** Deep link `https://wa.me/<numero>?text=<mensaje>` con el mensaje precargado incluyendo modelo, referencia y URL canónica. Construir el enlace en un adaptador de infraestructura, no en el componente. **Pendiente: el número de WhatsApp aún no está definido.**

Instrumentar el embudo con eventos nombrados: `view_item`, `add_to_cart`, `begin_checkout`, `whatsapp_click`, detrás del port `Analytics` para que el proveedor sea sustituible.

### 5.9 Calidad

- Dominio y casos de uso con tests unitarios y repositorios en memoria; cobertura alta aquí, baja en presentación.
- Playwright sobre los dos caminos de conversión y sobre la navegación entre las tres vistas.
- `axe-core` en CI: contraste mínimo 4.5:1 en prosa. Cuidado con el gris `#A1A1A1` sobre negro a tamaños pequeños y con el magenta sobre negro en texto de cuerpo — reservar el acento para labels grandes y fondos de botón.
- CI: typecheck, lint, chequeo de fronteras, unit, e2e, Lighthouse. Preview deploy por PR.

---

## 6. Orden de trabajo sugerido

1. Scaffold de Next.js con TypeScript, Tailwind y los tokens en `@theme`. Chequeo de fronteras desde el día uno.
2. Dominio y casos de uso con un repositorio en memoria alimentado con los 8 productos del prototipo. Sin UI todavía.
3. Primitivas y chrome: Header, SideMenu, CartDrawer, LoadingScreen.
4. Home completa contra el repositorio en memoria.
5. Colección y detalle, con `generateStaticParams`.
6. Sustituir el repositorio en memoria por el adaptador del CMS. Nada más debería cambiar — si algo más cambia, la frontera estaba mal puesta.
7. Checkout, WhatsApp y analítica.
8. Presupuesto de rendimiento y SEO: OG images, JSON-LD, sitemap, Lighthouse CI.

---

## 7. Pendientes de contenido

El prototipo usa placeholders que deben resolverse antes de salir a producción:

- Referencias 02 a 08: nombres, especificaciones, precios y fotos reales. Solo la 01 tiene imágenes definitivas.
- Precios: los valores actuales son inventados.
- Texto descriptivo del detalle de producto.
- Número de WhatsApp.
- Posts de Instagram y enlace real del perfil.
- Dirección del showroom y condiciones legales de garantía, envíos y devoluciones.
- El video vertical de la sección "En movimiento" es un clip horizontal recortado; se necesita material vertical nativo.

## 8. Nota legal

El prototipo nombra "Rolex" y usa material de esa marca como referencia de producto en venta. Vender relojes de segunda mano usando el nombre de la marca es legítimo, pero el material audiovisual y fotográfico de campaña es propiedad del fabricante: en producción hay que usar fotografía y video propios de las piezas reales en inventario, y evitar cualquier tratamiento visual que sugiera afiliación oficial o distribución autorizada.
