# Contribuir a Neon Night

La guía completa está en **[docs/GITHUB.md](docs/GITHUB.md)**: ramas, convención **gitmoji**, pull requests, revisión, CI, versiones y etiquetas.

En resumen:

1. Crea una rama desde `main`: `feat/…`, `fix/…`, `docs/…`, `chore/…` o `hotfix/…`.
2. Escribe los commits con gitmoji: `✨ (admin): agrega filtro por categoría`. El hook `commit-msg` lo valida; se activa con `npm install`.
3. Antes de abrir el PR, corre `npm run check`, y `npm run e2e` si cambias algo visible o un flujo.
4. Abre el PR con un título en formato gitmoji y la plantilla completa. Se integra por **squash** cuando el CI está en verde y tiene una aprobación.
5. Al hacer merge a `main`, el despliegue a producción es automático (ver [docs/DEPLOY.md](docs/DEPLOY.md)).
