# Neon Night — Guía de GitHub

> **Repositorio:** [`kodecol/neonnight`](https://github.com/kodecol/neonnight) · **Rama principal:** `main` (protegida; cada merge se despliega a producción)
> **Metodología de commits:** [gitmoji](https://gitmoji.dev), validada en local (hook) y en CI (título del PR).

---

## 1. Resumen del flujo

```
main ──┬────────────────────────────────────────────────●──────────────▶  (cada merge = despliegue)
       │                                                ▲ squash: "✨ (admin): agrega filtro por categoría"
       └─ feat/filtro-categoria ── ● ── ● ── ● ── PR ───┘
                                    commits gitmoji      CI: pr-title + check · 1 aprobación
```

1. Crea una rama corta desde `main`.
2. Haz los commits con gitmoji.
3. Abre un PR con un título gitmoji y completa la plantilla.
4. El CI corre `pr-title` y `check`, y alguien revisa y aprueba.
5. Se integra por **squash**: un commit por PR en `main`.
6. GitHub Actions construye la imagen, la despliega y verifica la versión servida (ver [`DEPLOY.md`](DEPLOY.md)).

---

## 2. Ramas

| Rama | Para qué | Ejemplo |
| --- | --- | --- |
| `main` | Producción. Protegida: no se hace push directo ni force-push, y no se puede borrar | — |
| `feat/<tema>` | Funcionalidad nueva | `feat/filtro-categoria` |
| `fix/<tema>` | Corrección | `fix/total-carrito` |
| `hotfix/<tema>` | Corrección urgente de producción | `hotfix/webhook-bold` |
| `refactor/<tema>` | Refactor sin cambio funcional | `refactor/catalogo-productos` |
| `docs/<tema>` | Solo documentación | `docs/guia-github` |
| `chore/<tema>` | Configuración, dependencias, CI | `chore/dependabot` |

**Reglas:**
- El nombre va en minúsculas, con guiones y sin tildes.
- Las ramas son cortas, de días y no de semanas. Si una se alarga, se divide.
- Se actualiza desde `main` con `git rebase origin/main`, o con *Update branch* en el PR. La historia de `main` es lineal.
- La rama se borra sola al hacer merge.

---

## 3. Commits con gitmoji

### 3.1 Formato

```
<gitmoji> [(ámbito)]: <resumen>        ← primera línea, máximo 100 caracteres, sin punto final

<cuerpo opcional: qué y por qué, no cómo>

<pie opcional: Closes #12 · BREAKING CHANGE: …>
```

- **Gitmoji:** uno solo, el que mejor describa la **intención** del cambio, tomado de la tabla 3.2.
- **Ámbito:** es opcional. Va en minúsculas y dice qué parte cambia: `admin`, `tienda`, `checkout`, `bold`, `catalogo`, `deploy`, `ci`, `deps`, `docs`.
- **Resumen:** en español, en imperativo presente y en minúsculas. Por ejemplo, `agrega…`, `corrige…`, `elimina…`.

| ✅ Bien | ❌ Mal |
| --- | --- |
| `✨ (admin): agrega filtro por categoría` | `feat: filtro` (sin gitmoji) |
| `🐛 (checkout): corrige total con piezas vendidas` | `🐛 arreglos` (no dice qué) |
| `♻️ (catalogo): separa el mapper de productos` | `✨ (Admin): Agregué filtro.` (mayúsculas, pasado, punto) |
| `⬆️ (deps): sube next a 15.5.26` | `✨🐛 varias cosas` (más de una intención: van en commits separados) |

### 3.2 Gitmojis del proyecto

| Gitmoji | Uso | Gitmoji | Uso |
| --- | --- | --- | --- |
| ✨ | Nueva funcionalidad | 🔒️ | Seguridad o privacidad |
| 🐛 | Corrige un bug | 🔐 | Secretos (nunca su valor) |
| 🚑️ | Hotfix crítico | 🗃️ | Base de datos o esquema |
| 🩹 | Corrección menor | 🍱 | Assets (imágenes, logos, videos) |
| ♻️ | Refactor | 🔥 | Elimina código o archivos |
| ⚡️ | Rendimiento | 🚚 | Mueve o renombra |
| 💄 | UI y estilos | 🏷️ | Tipos de TypeScript |
| 🎨 | Estructura o formato | ♿️ | Accesibilidad |
| 📝 | Documentación | 🔍️ | SEO |
| 💬 | Textos y copys | 🌐 | Idioma o localización |
| ✅ | Tests | 🦺 | Validación |
| 🔧 | Configuración | 🚨 | Warnings de lint o del compilador |
| 🔨 | Scripts de desarrollo | 💥 | Cambio incompatible |
| 👷 | CI/CD | 🔖 | Release o versión |
| 🚀 | Despliegue | ⏪️ | Revierte cambios |
| 🐳 | Docker | 🔀 | Merge de ramas |
| 🧱 | Infraestructura | 🙈 | `.gitignore` |
| ⬆️ ⬇️ | Sube o baja dependencias | ➕ ➖ | Agrega o quita una dependencia |

La lista oficial está en <https://gitmoji.dev>. Si hace falta uno que no está, se agrega a `scripts/check-commit-msg.mjs` y a esta tabla en el mismo PR.

### 3.3 Validación automática

- **Local:** el hook `.githooks/commit-msg` rechaza los commits que no cumplen el formato.
  - Se activa solo con `npm install`, porque el script `prepare` corre `git config core.hooksPath .githooks`.
  - Para comprobar un mensaje a mano: `npm run commit:check -- "✨ (admin): agrega filtro"`.
- **CI:** el job `pr-title` valida el **título del PR**, que es el que queda en `main` al hacer squash.
- Para escribir gitmojis cómodamente, se puede usar [`gitmoji-cli`](https://github.com/carloscuesta/gitmoji-cli) (`npx gitmoji-cli -c`) o la extensión *Gitmoji* de VS Code. Ninguna es obligatoria.

---

## 4. Pull requests

1. **Título:** en formato gitmoji, porque será el commit en `main`. Ejemplo: `✨ (admin): agrega filtro por categoría`.
2. **Descripción:** se completa la [plantilla](../.github/pull_request_template.md): qué cambia, por qué, cómo se probó y si el despliegue necesita algo.
3. **Tamaño:** que se pueda revisar en unos 20 minutos. Si no se puede, se divide.
4. **Borrador:** se abre como *Draft* mientras no esté listo.
5. **Etiquetas:** un `tipo:` y, si aplica, un `área:` (§7). Con ellas se arman las notas de versión.
6. **Para hacer merge hace falta:**
   - CI en verde (`pr-title` y `check`);
   - **1 aprobación**;
   - conversaciones resueltas;
   - la rama al día con `main`.
7. **Método:** solo **squash merge**. Se puede activar *auto-merge* para que se integre en cuanto cumpla todo.

### 4.1 Revisión

- **Quien revisa** mira que el código sea correcto, que respete las fronteras de la arquitectura (el lint las verifica), que haya pruebas, que no haya secretos y que la UI se vea bien en móvil.
- **Los comentarios** se marcan como **bloqueante** o **sugerencia**.
- **Quien abre el PR** responde o corrige; no cierra conversaciones ajenas.

---

## 5. CI/CD (GitHub Actions)

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

| Job | Cuándo | Qué hace |
| --- | --- | --- |
| `pr-title` | PR | Valida el título con gitmoji |
| `check` | PR y push a `main` | `npm ci`, typecheck, lint (incluye las fronteras de la arquitectura) y tests unitarios |
| `build` | push a `main`, con `DEPLOY_ENABLED=true` | Imagen `ghcr.io/kodecol/neonnight-web:<sha7>` en GHCR |
| `deploy` | push a `main`, con `DEPLOY_ENABLED=true` | Despliega en el VPS y comprueba que `https://neonightonline.com/api/health` sirva `<sha7>` |

`build` y `deploy` están **apagados** hasta que exista la variable del repo `DEPLOY_ENABLED=true`. Se activa cuando ya estén los secretos del VPS (§8): `gh variable set DEPLOY_ENABLED --body true`. Mientras tanto, cada push y cada PR solo corren la verificación.

- Los e2e (`npm run e2e`) corren en local antes de abrir el PR. Necesitan navegador y build, y por eso no están en el CI.
- El entorno `production` puede exigir una aprobación manual (Settings → Environments → production → *Required reviewers*).

---

## 6. Versiones y releases

- **SemVer:** `vMAYOR.MENOR.PARCHE`.
  - `MAYOR` sube con un 💥 cambio incompatible, por ejemplo de datos o de API.
  - `MENOR` sube con ✨ funcionalidades.
  - `PARCHE` sube con 🐛 o 🩹 correcciones.
- **Cuándo:** la versión es opcional por cada merge, porque cada merge ya despliega. Se recomienda una por hito visible.
- **Cómo:**
  ```bash
  git switch main && git pull
  git tag -a v1.2.0 -m "🔖 v1.2.0"
  git push origin v1.2.0
  gh release create v1.2.0 --generate-notes      # notas agrupadas por etiqueta (.github/release.yml)
  ```
- El SHA de cada versión se ve en `/api/health`, y la imagen correspondiente sigue en GHCR para el rollback (ver [`DEPLOY.md`](DEPLOY.md) §5.3).

---

## 7. Issues y etiquetas

- **Plantillas:** 🐛 Reporte de bug y ✨ Propuesta de funcionalidad (`.github/ISSUE_TEMPLATE/`). No se permiten issues en blanco.
- **Vulnerabilidades:** se reportan **en privado**, nunca en un issue (ver [`SECURITY.md`](../SECURITY.md)).
- **Etiquetas:**

  | Grupo | Etiquetas |
  | --- | --- |
  | Tipo | `tipo: funcionalidad`, `tipo: bug`, `tipo: seguridad`, `tipo: rendimiento`, `tipo: refactor`, `tipo: docs`, `tipo: dependencias`, `tipo: infraestructura` y `cambio incompatible` |
  | Área | `área: tienda`, `área: checkout`, `área: admin`, `área: ci`, `área: infraestructura` |
  | Estado | `estado: por revisar`, `estado: bloqueado` |
  | Otras | `omitir-changelog` |

- Un PR cierra su issue con `Closes #N` en la descripción.

---

## 8. Configuración del repositorio

Todo lo de esta sección lo aplica [`scripts/github-setup.sh`](../scripts/github-setup.sh), que es idempotente y necesita permiso **admin**:

| Área | Configuración |
| --- | --- |
| General | Descripción, `homepage` (https://neonightonline.com) y topics. Wiki y Projects desactivados |
| Merge | Solo squash, con el título del PR como commit. Auto-merge activado. Las ramas se borran al hacer merge |
| Protección de `main` (ruleset "main protegida") | PR obligatorio con 1 aprobación. Las aprobaciones se descartan con cada push nuevo. Conversaciones resueltas. Checks `check` y `pr-title` con la rama al día. Historia lineal. No se permite force-push ni borrar la rama |
| Seguridad | Alertas y actualizaciones de seguridad de Dependabot, escaneo de secretos y *push protection* |
| Dependabot | `.github/dependabot.yml`: npm cada semana (agrupado) y Actions y Docker cada mes, con mensajes `⬆️ (deps): …` |
| Entorno | `production`, con la variable `SITE_URL` |
| Secretos del CI | `DEPLOY_SSH_KEY`, `DEPLOY_HOST_KEY`, `DEPLOY_HOST` y `DEPLOY_USER` (ver [`DEPLOY.md`](DEPLOY.md) §8.4). Se cargan con `gh secret set`, nunca en archivos del repo |

> En un repo **privado** de una organización con plan gratuito, GitHub no hace cumplir los rulesets ni la protección de ramas. Para que `main` quede protegida, el repo debe ser público o la organización debe tener plan Team.

---

## 9. Secretos y datos sensibles

- **Nunca** se versionan `.env`, llaves, tokens, contraseñas ni datos de clientes. El `.gitignore` cubre `.env*`, salvo `.env.example`.
- La infraestructura concreta (IPs, usuarios, rutas de llaves) va en `docs/DEPLOY.md` **solo si el repo es privado**. En un repo público se usan marcadores (`<IP_VPS>`), y los valores reales se guardan fuera del repo.
- Si un secreto llega a un commit, aunque sea en una rama, se **rota**. Reescribir el historial no basta, porque GitHub y los clones pueden conservarlo.

---

## 10. Inicio rápido para quien llega al proyecto

```bash
git clone https://github.com/kodecol/neonnight.git && cd neonnight
npm install                      # instala dependencias y activa el hook gitmoji
cp .env.example .env.local       # y completa los valores
npm run db:up && npm run dev     # MongoDB local + http://localhost:3000
git switch -c feat/mi-cambio
# … cambios …
npm run check
git commit -m "✨ (tienda): agrega mi cambio"
git push -u origin feat/mi-cambio
gh pr create --fill              # completa la plantilla y revisa el título gitmoji
```
