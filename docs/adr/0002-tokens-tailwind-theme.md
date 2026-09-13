# ADR 0002 — Tokens del design system en `@theme` de Tailwind 4

**Fecha:** 2026-09-13 · **Estado:** aceptada

## Contexto

El handoff (§4 y §5.1) fija colores, tipografía y espaciado finales sobre fondo negro, radio 0 y sin sombras, y pide mapearlos a `@theme` en CSS, no en `tailwind.config`.

## Decisión

- Todos los tokens viven en `src/presentation/styles/globals.css` dentro de `@theme`. Se resetean las paletas por defecto de Tailwind (`--color-*: initial`, `--radius-*: initial`, `--shadow-*: initial`) para que solo existan los tokens del sistema.
- La escala tipográfica se declara como `--text-<rol>` con `line-height`, `letter-spacing` y `font-weight` adjuntos, de modo que `text-display`, `text-h2`, `text-lead`, `text-label`… aplican el rol completo.
- Utilidades propias (`px-page`, `py-section`, `text-display-fluid`, `text-h2-fluid`) encapsulan el responsive: 20/32/56 px de padding lateral y 44/64/88 px de display según breakpoint.
- Una regla `no-restricted-syntax` prohíbe `rounded-*` en cualquier `className`.
- El DS Modernist del handoff (`_ds/styles.css`) **no se porta**: es light-theme y con pesos distintos. Solo se conserva la fuente Archivo (pesos 200/400/500/600 vía `next/font`).

## Consecuencias

- Cambiar un color o un tamaño es editar una variable; ningún componente lleva hex ni px de tokens.
- Los valores de escritorio son fieles al píxel; tablet y móvil son criterio propio del equipo de implementación (ver README).
