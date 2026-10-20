<!-- Título del PR = mensaje del commit al hacer squash. Formato gitmoji: "✨ (ámbito): resumen" (docs/GITHUB.md §3). -->

## Qué cambia

<!-- Una o dos frases: qué problema resuelve y cómo. -->

## Por qué

<!-- Contexto o issue relacionado: Closes #123 -->

## Cómo se probó

- [ ] `npm run check` (typecheck, lint y tests unitarios)
- [ ] `npm run e2e` si cambia algo visible o un flujo (navegación, checkout, admin)
- [ ] Revisado en escritorio y en móvil, si toca la UI

## Despliegue

- [ ] No requiere nada especial
- [ ] Requiere variables de entorno nuevas (documentadas en `deploy/.env.example` y `docs/DEPLOY.md`)
- [ ] Cambia `deploy/` (compose o scripts): hay que copiarlos al VPS **antes** del merge (`docs/DEPLOY.md` §6.2)
- [ ] Cambia datos o esquema en Mongo (campos nuevos opcionales o con valor por defecto)

## Capturas

<!-- Si cambia la UI: antes y después. -->
