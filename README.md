# Neon Night

Tienda de relojes de lujo verificados (Colombia). Reconstrucción en **Next.js 15** del prototipo hi-fi entregado en `docs/handoff/`, siguiendo la arquitectura y los tokens definidos en ese handoff.

- **Stack:** Next.js 15 (App Router, RSC), React 19, TypeScript strict, Tailwind CSS 4 (`@theme`), Zod, Vitest, Playwright + axe-core.
- **Arquitectura:** clean architecture en cuatro capas con fronteras verificadas por lint (ver `docs/adr/`).
- **Estado:** pasos 1–5 del handoff + SEO base. CMS, pasarela y analítica son **puertos con stubs**.

## Requisitos

- Node 22+ y npm.
- Para e2e: `npm run e2e:install` (descarga Chromium).
- Para Docker: Docker 24+.

## Comandos

```bash
cp .env.example .env.local      # ajusta NEXT_PUBLIC_SITE_URL y el número de WhatsApp
npm install
npm run dev                     # http://localhost:3000

npm run typecheck               # tsc --noEmit
npm run lint                    # eslint (incluye fronteras y prohibición de rounded-*)
npm run test                    # Vitest: dominio, casos de uso, infraestructura
npm run e2e                     # Playwright: build + start en :3100 + navegación, conversión, axe
npm run check                   # typecheck + lint + test
npm run build && npm start      # producción
```

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL absoluta del sitio: canonicals, sitemap, OG, JSON-LD, URL de retorno del checkout |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número internacional sin `+`. Vacío = enlaces de WhatsApp deshabilitados (**pendiente de definir**) |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Enlace del perfil |

## Rutas

| Ruta | Render | Notas |
| --- | --- | --- |
| `/` | estática, ISR 1h | Hero con video, grilla 3 col (6 piezas), banda parallax, garantía, "En movimiento", grilla de Instagram con posts |
| `/coleccion` | server, filtros por `searchParams` (`?categoria=`, `?max=`) | Grilla 4 col. Con filtros → `noindex, follow` |
| `/reloj/[slug]` | SSG (`generateStaticParams`) + ISR 1h | Hero, sub-nav sticky, descripción, galería, banda, specs, cierre. JSON-LD `Product`, OG image dinámica |
| `/gracias` | dinámica | Retorno del checkout stub |
| `/api/checkout` | POST | Recalcula precio y disponibilidad en el servidor |
| `/sitemap.xml`, `/robots.txt` | generados desde el repositorio | |

## Arquitectura

```
src/
  domain/           Capa 0 — entidades (Watch, Order), value objects (Money, Slug, Reference),
                    interfaces de repositorio, reglas puras. Sin dependencias externas.
  application/      Capa 1 — casos de uso (ListWatches, GetWatchBySlug, ResolveCart, Checkout),
                    DTOs y puertos (PaymentGateway, Analytics, WhatsAppLinkBuilder, Clock).
  infrastructure/   Capa 2 — InMemoryWatchRepository + seed, NoopPaymentGateway,
                    ConsoleAnalytics, WaMeLinkBuilder, container.ts.
  presentation/     Capa 3 — components/{primitives,blocks,chrome,seo}, hooks, styles, lib.
  app/              Rutas del App Router. Única capa que llama a getContainer().
tests/unit          Vitest        tests/e2e   Playwright
docs/handoff        Prototipo y README originales      docs/adr   Decisiones
```

**Regla de oro:** `presentation` nunca importa de `infrastructure`. `eslint-plugin-boundaries` lo hace cumplir en `npm run lint`. Las rutas piden el caso de uso al contenedor y pasan DTOs a los componentes.

### Sustituir los stubs

1. **CMS:** implementar `WatchRepository` en `src/infrastructure/cms/` y registrarlo en `container.ts` (ver `src/infrastructure/cms/README.md`).
2. **Pagos:** implementar `PaymentGateway` (Wompi, Mercado Pago…) en `src/infrastructure/payments/`. El caso de uso `Checkout` ya recalcula el total y valida disponibilidad antes de llamarlo. Añadir un `OrderRepository` persistente antes de cobrar.
3. **Analítica:** implementar `Analytics` con el proveedor elegido. Los eventos ya emitidos: `view_item`, `begin_checkout`. `add_to_cart` y `whatsapp_click` se emiten desde cliente cuando exista el proveedor.

## Contenido centralizado

Todo el contenido editorial (copys, menú, footer, secciones de la home, filtros, textos de la bolsa, plantillas de WhatsApp y posts de Instagram) vive en **un solo archivo**: `src/infrastructure/content/site-content.ts`, tipado por `SiteContent` (`src/application/dto/site-content.dto.ts`). Los componentes no contienen textos fijos: reciben el contenido por props desde las rutas, que lo piden al contenedor a través del puerto `SiteContentRepository`.

- Cambiar un copy, añadir un post de Instagram o un enlace del footer = editar ese archivo.
- Las plantillas usan `{clave}` (`{brand}`, `{count}`, `{year}`, `{items}`, `{total}`) y se resuelven con `fill()` de `src/application/lib/template.ts`.
- Cuando exista CMS, se implementa `SiteContentRepository` sobre él y se registra en `container.ts`; nada más cambia.
- El catálogo de producto vive aparte, en `src/infrastructure/cms/seed.ts`, con la misma lógica de sustitución.

## Diseño y tokens

Todos los tokens están en `src/presentation/styles/globals.css` (`@theme`). Radio 0 y sin sombras en todo el sistema; `rounded-*` está prohibido por lint. Escritorio es fiel al píxel al handoff (padding 56 px, display 88 px, grillas 3/4 col). Tablet (≥768) y móvil son criterio propio: 32/20 px de padding, display 64/44 px, grillas 2/1 col. Parallax y video del hero se desactivan en móvil y bajo `prefers-reduced-motion`; la pantalla de carga se desmonta del DOM, no se renderiza con reduced motion y aparece una vez por sesión.

### Accesibilidad — excepciones conocidas

El diseño hi-fi fija dos combinaciones que no alcanzan 4.5:1: label blanco sobre magenta `#FF006E` (≈3.6:1) y gris terciario `#515151` sobre negro (≈2.4:1). El chequeo axe de e2e las excluye (`.bg-accent`, `.text-ink-3`) hasta que diseño defina la alternativa. El resto de la página pasa WCAG 2.1 AA sin violaciones serias.

## Rendimiento

Build actual: JS inicial ≈113 kB (presupuesto 120 kB). Imágenes vía `next/image` con AVIF/WebP y alto reservado con `aspect-ratio`. **Pendiente:** transcodificar `public/assets/hero-day-date.mp4` (12 MB) y `vertical-daytona.mp4` (13 MB) a H.264/AV1 por debajo de 3 MB; los posters (`*-poster.jpg`) ya se generaron con ffmpeg y se sirven en móvil.

## Docker / VPS

```bash
docker build -t neonnight \
  --build-arg NEXT_PUBLIC_SITE_URL=https://neonnight.co \
  --build-arg NEXT_PUBLIC_WHATSAPP_NUMBER=57300XXXXXXX .
docker run -p 3000:3000 neonnight
```

La imagen usa `output: "standalone"` y corre como usuario no-root. La caché de ISR vive en el contenedor; para varias réplicas configurar un cache handler compartido.

## Pendientes de contenido (handoff §7)

- Las 8 referencias son modelos reales (Rolex Sky-Dweller 326938, Rolex Daytona 126500LN, Tudor BB58, Rolex GMT-Master II 126710BLNR, Rolex Datejust 36, Omega Speedmaster sapphire, Cartier Santos Large, Omega Seamaster 300M) con specs de catálogo, pero las **fotos son de un retailer externo recortadas a PNG solo para el mockup**. Sustituir por fotografía propia del inventario.
- Precios orientativos en COP, no confirmados.
- Textos descriptivos redactados como placeholder informado; revisar con el equipo comercial.
- Número de WhatsApp.
- Posts de Instagram: los actuales (`public/assets/ig/`) son recortes de fotos de catálogo de terceros para el mockup; cambiar por posts reales y el enlace del perfil.
- Dirección del showroom y condiciones legales (garantía, envíos, devoluciones).
- Video vertical nativo para "En movimiento" (el actual es un recorte horizontal).

## Nota legal (handoff §8)

El prototipo nombra "Rolex" y usa material de esa marca como referencia. Las fotos de producto de las 8 referencias (`public/assets/ref0X-*.png`) provienen de un catálogo de terceros y se recortaron únicamente para este mockup: **no tienen licencia para producción**. Antes de publicar hay que usar fotografía y video propios de las piezas en inventario y evitar cualquier tratamiento que sugiera afiliación oficial.
