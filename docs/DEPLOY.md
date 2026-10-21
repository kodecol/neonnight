# Neon Night — Infraestructura y despliegue

> **Para quién:** cualquier persona o agente que despliegue, opere o haga rollback de Neon Night.
> **Dónde:** VPS de producción compartido (`<IP_VPS>`), publicado en **https://neonightonline.com**.
> **Datos reales** (IP, usuario, accesos, inventario del VPS): `docs/private/INFRA.md`, solo local y fuera de git.
> **Regla cero:** el VPS lo comparten otros servicios de producción. Neon Night vive **aislado** y nada de lo que se haga para Neon Night puede tocar a los demás.

---

## 1. Arquitectura

```
                 ┌──────────────── VPS de producción <IP_VPS> · Ubuntu 24.04 · 4 CPU · 15 GB ─────────────┐
 Navegador       │                                                                                         │
   │ HTTPS       │  nginx-proxy-manager (contenedor, 80/443)                                               │
   └────────────▶│    ├─ proxy hosts de otros servicios ───▶ otros contenedores        (NO TOCAR)          │
                 │    └─ neonightonline.com ─red `proxy`──▶ neonnight-web:3000 (Next.js 15)                │
                 │                                           1 CPU · 512 MB · sin swap · raíz solo lectura  │
                 │                                           127.0.0.1:3100 (solo para verificar en el VPS) │
                 └───────────────────────────────────────────────┬─────────────────────────────────────────┘
                                                                 │
                     ┌────────────────────────┬──────────────────┼──────────────────┐
                     ▼                        ▼                  ▼                  ▼
              MongoDB Atlas (M0)       Cloudinary (fotos)    Bold (pagos)    GHCR (imágenes)
              catálogo, órdenes,       subidas desde         link de pago    una etiqueta por
              config. de pagos         /admin                + webhook       versión (historial)
```

| Pieza | Dónde | Notas |
| --- | --- | --- |
| App | Contenedor `neonnight-web` en `/opt/apps/neonnight/`, proyecto compose `neonnight` | Next.js `standalone` con usuario sin privilegios. Imagen de ~285 MB en capas (404 MB según `docker images`) |
| Publicación y TLS | **nginx-proxy-manager** (NPM) del VPS: proxy host `neonightonline.com` → `neonnight-web:3000` | Certificado Let's Encrypt **propio** que emite NPM. Los proxy hosts de otros servicios no se tocan |
| Red | Solo la red externa `proxy`, la misma de NPM | No hay red interna porque la app no tiene base de datos local |
| Base de datos | MongoDB Atlas, cluster M0 gratis, base `neonnight` | **No se usa ninguna base ni caché de otros servicios del VPS.** El primer arranque siembra el catálogo una vez |
| Fotos y videos | Cloudinary: `neonnight/catalogo/` (medios del catálogo) y `neonnight/catalogo/subidas/` (subidas desde `/admin`) | Plan gratuito. Se entregan desde el CDN de Cloudinary (`f_auto`, `q_auto`, ancho por layout): el VPS no las procesa ni las guarda. Los medios del catálogo **no viajan en la imagen** (`.dockerignore`) |
| Pagos | Bold: API de Links de pago y webhook `/api/webhooks/bold` | Las llaves se ingresan en `/admin/ajustes/pagos` y se guardan cifradas en Atlas |
| Imágenes | `ghcr.io/<owner>/neonnight-web:<sha>` | En el VPS queda **una sola imagen**: el historial vive en GHCR |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) | Verifica, construye, despliega y comprueba la versión servida |

### 1.1 Recursos

| | Valor |
| --- | --- |
| Límites del contenedor | `cpus: 1.0`, `mem_limit: 512m`, sin swap, `pids_limit: 256`, heap de Node de 384 MB |
| Consumo medido | ~70 MB en reposo y ~180 MB con 10 visitas simultáneas sin pausa. Con 1 CPU atiende unas 9 páginas por segundo |
| Disco | Unos 400 MB de imagen, más la caché de `next/image` y logs con tope de 3 × 10 MB |

El límite de la guía del VPS es máximo 1 CPU y 2 GB sin consultarlo. Neon Night queda por debajo.

### 1.2 Reglas del VPS

1. **No se toca nada de otros servicios** (inventario en `docs/private/INFRA.md`):
   - sus contenedores, incluido `nginx-proxy-manager`;
   - sus compose, `.env` y redes (salvo **unirse** a `proxy`);
   - sus carpetas en `/opt/apps/`;
   - el crontab existente;
   - los proxy hosts existentes.
2. **Prohibido:**
   - `docker system/image/volume/network prune` sin filtro;
   - reiniciar Docker o el VPS;
   - tocar `ufw` o paquetes del sistema;
   - usar `pkill -f` o `pgrep -f`; en su lugar se usa `ps -eo pid,args | grep "[p]atrón"`;
   - usar `sudo`, que pide contraseña. Si hace falta, se pregunta antes.
3. **Datos y credenciales propios.** Nunca se usan los de otros servicios.
4. **Ningún puerto en `0.0.0.0`.** El público entra por NPM; `127.0.0.1:3100` es solo para verificar desde el VPS.
5. **No se compila en el VPS.** La imagen se construye en CI o en la máquina de desarrollo y el VPS solo la carga.
6. **Secretos:**
   - van en `/opt/apps/neonnight/.env` (permisos 600) y en los secretos de GitHub;
   - nunca van al repo, al chat, a un log ni a la salida de `docker compose config`, que los muestra.
7. **Imagen única (decisión del proyecto):** no se guarda una `:prev` en el VPS. El rollback se hace con GHCR (§5.3).

---

## 2. Archivos

| En el repo | En el VPS | Para qué |
| --- | --- | --- |
| `Dockerfile` | — | Imagen multi-stage. Recibe `BUILD_SHA`, lo expone en `/api/health` e incluye un healthcheck |
| `deploy/docker-compose.yml` | `/opt/apps/neonnight/docker-compose.yml` | Servicio `web`: límites, solo lectura, red `proxy` y loopback `3100` |
| `deploy/deploy.sh` | `/opt/apps/neonnight/deploy.sh` | Cambio de versión con verificación, vuelta atrás automática y registro en `deploys.log`. `deploy.sh status` es de solo lectura |
| `deploy/ci-deploy.sh` | `/opt/apps/neonnight/ci-deploy.sh` | Orden forzada de la llave del CI: valida la imagen, hace login en GHCR con un `DOCKER_CONFIG` propio y llama a `deploy.sh` |
| `deploy/.env.example` | `/opt/apps/neonnight/.env` | Variables de runtime (secretos) |
| `.github/workflows/deploy.yml` | — | CI/CD |
| — | `/opt/apps/neonnight/deploys.log` | Historial de despliegues |

> El compose y los scripts **viven en el VPS**. Si cambian en el repo, se copian a mano (§6.2) **antes** del push que los necesita.

### 2.1 Variables de entorno (runtime)

La imagen no depende del dominio: todo se lee al arrancar.

| Variable | Obligatoria | Ejemplo o nota |
| --- | --- | --- |
| `SITE_URL` | sí | `https://neonightonline.com`. Se usa en canonicals, el sitemap y el retorno de Bold |
| `MONGODB_URI` | sí | `mongodb+srv://…` de Atlas. Sin ella, la app usa memoria y **pierde los cambios al reiniciar** |
| `MONGODB_DB` | no | `neonnight` |
| `CLOUDINARY_URL` | sí, para fotos | `cloudinary://key:secret@cloud` |
| `ADMIN_PASSWORD` | sí | Contraseña inicial del panel; al cambiarla en `/admin/ajustes/seguridad` rige la de la base |
| `ADMIN_SECRET` | sí | 32 caracteres o más. Si cambia, hay que volver a ingresar la llave de Bold |
| `WHATSAPP_NUMBER` | no | `573001234567` |
| `INSTAGRAM_URL`, `FACEBOOK_URL`, `YOUTUBE_URL` | no | Por defecto ya son los perfiles reales; solo hace falta si cambian |
| `TIKTOK_URL` | no | Vacía = TikTok no aparece |
| `GA_MEASUREMENT_ID` | no | `G-XXXXXXX`. Activa Google Analytics 4 y el banner de cookies |
| `META_PIXEL_ID` | no | Solo dígitos. Activa el píxel de Meta y el banner de cookies |
| `GOOGLE_SITE_VERIFICATION` | no | Código de la etiqueta `<meta>` de Search Console |
| `META_DOMAIN_VERIFICATION` | no | Código de verificación de dominio de Meta Business |

Después de editar el `.env`, se aplica con `cd /opt/apps/neonnight && docker compose up -d --force-recreate web`.

---

## 3. Endpoint de salud

`GET /api/health` devuelve `{"status":"ok","version":"<sha>","db":"mongodb"}`. Con `?deep=1` además consulta Atlas.

- Lo usan el healthcheck del contenedor, `deploy.sh` y el CI.
- **Un 200 no basta:** se compara `version` con el SHA desplegado.

---

## 4. Primera instalación (una sola vez)

Lo que ya está hecho aparece marcado con ✅.

1. ✅ **Reconocimiento del VPS** en solo lectura: recursos, contenedores, redes, puertos y NPM.
2. ✅ **Carpeta** `/opt/apps/neonnight/` con el compose, `deploy.sh`, `ci-deploy.sh` y `.env` (600).
3. ✅ **Primer despliegue manual** (§5.2). Por ahora solo se puede ver en `127.0.0.1:3100`, porque **todavía no está publicado**.
4. **MongoDB Atlas** y **Cloudinary** (§8). Luego se ponen `MONGODB_URI` y `CLOUDINARY_URL` en el `.env` y se aplica.
5. **DNS** (§7): `@` y `www` deben apuntar a `<IP_VPS>`.
6. **Proxy host en NPM**, por su API desde el VPS, una vez que el DNS ya resuelve al VPS:
   ```bash
   TOKEN=$(cat <ARCHIVO_TOKEN_NPM>)   # ubicación y renovación: docs/private/INFRA.md; nunca hacer echo
   curl -s -X POST http://127.0.0.1:81/api/nginx/proxy-hosts \
     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d '{"domain_names":["neonightonline.com","www.neonightonline.com"],
          "forward_scheme":"http","forward_host":"neonnight-web","forward_port":3000,
          "certificate_id":"new","meta":{"dns_challenge":false},
          "ssl_forced":true,"http2_support":true,"hsts_enabled":true,"block_exploits":true,
          "allow_websocket_upgrade":false,"caching_enabled":false,
          "advanced_config":"client_max_body_size 12m;"}'
   ```
   - **No** se incluye `letsencrypt_email`: esta versión de NPM lo rechaza.
   - Anota el `id` del proxy host en el §9.
7. **Verificación:**
   - `curl -sI https://neonightonline.com` debe dar 200, y `curl -sI http://neonightonline.com` un 301;
   - `curl -s https://neonightonline.com/api/health?deep=1` debe devolver `"db":"mongodb"`.
8. **Los demás servicios intactos:**
   - sus comandos de estado (de solo lectura) siguen en verde (lista en `docs/private/INFRA.md`);
   - `docker ps`: los contenedores de los otros servicios siguen `healthy`;
   - `ss -tlnH`: no hay puertos nuevos en `0.0.0.0`.
9. **GitHub:** repo privado, secretos del §8.4 y variable `SITE_URL`.
10. **Bold:** guarda las llaves en `/admin/ajustes/pagos` y registra el webhook `https://neonightonline.com/api/webhooks/bold`. Prueba primero en **Pruebas**.

---

## 5. Despliegue de cada versión

### 5.1 Flujo normal

```
rama feat/… ──PR──▶ CI "check" (typecheck + lint + tests) ──revisión──▶ merge a main
                                                                          │
     ┌────────────────────────────────────────────────────────────────────┘
     ▼
 CI build:  imagen ghcr.io/<owner>/neonnight-web:<sha7>   (BUILD_SHA=<sha7>)
     ▼
 CI deploy: ssh <USUARIO_DEPLOY>@<IP_VPS> (llave con orden forzada) → ci-deploy.sh
            → login a GHCR (token por stdin, DOCKER_CONFIG temporal) → deploy.sh <imagen> → logout
     ▼
 deploy.sh: tag current → recrea solo neonnight-web → espera healthy + version == sha7
            ├─ OK    → borra la imagen anterior (en el VPS queda una sola) → deploys.log
            └─ falla → vuelve a la anterior, deja el registro y el job queda en rojo
     ▼
 CI verifica que https://neonightonline.com/api/health devuelva sha7
```

1. Trabaja en una rama (`feat/…` o `fix/…`). En local, corre `npm run check` y `npm run e2e`.
2. Abre un PR: el CI ejecuta `check`. Si sale en rojo, no se hace merge.
3. Haz merge a `main`: se despliega solo, en unos 6 a 10 minutos.
4. Comprueba que `https://neonightonline.com/api/health` muestre el SHA nuevo, y revisa la tienda y `/admin`.

El entorno `production` del workflow puede exigir una aprobación manual (Settings → Environments → production → Required reviewers).

### 5.2 Despliegue manual (sin CI)

Los comandos usan el alias SSH `neonnight-vps`. Se define una sola vez en `~/.ssh/config` de la máquina de desarrollo; los valores reales están en `docs/private/INFRA.md`:

```
Host neonnight-vps
    HostName <IP_VPS>
    User <USUARIO_DEPLOY>
    IdentityFile ~/.ssh/<llave>
    HostKeyAlias <VPS_HOSTKEY_ALIAS>
```


Desde la máquina de desarrollo, con el código commiteado. Se compila aquí y el VPS solo carga la imagen:

```bash
SHA=$(git rev-parse --short=7 HEAD)
docker build -t neonnight-web:$SHA --build-arg BUILD_SHA=$SHA .
docker save neonnight-web:$SHA | gzip -1 | ssh neonnight-vps 'gunzip | docker load'
ssh neonnight-vps "/opt/apps/neonnight/deploy.sh neonnight-web:$SHA"
```

### 5.3 Rollback

En el VPS hay **una sola imagen**. Las versiones anteriores están en GHCR, así que el rollback es **redesplegar un SHA anterior**:

- **Con CI:** Actions → `ci-cd` → *Run workflow* sobre el commit anterior. También sirve `git revert` y merge, que deja historial.
- **Sin CI, desde GHCR:** se descarga en el VPS la etiqueta anterior. Para eso hace falta un token de **solo lectura** (`read:packages`, nunca con permiso de escritura), que se pasa por stdin y se guarda en un `DOCKER_CONFIG` temporal para no pisar sesiones de otros proyectos:
  ```bash
  export DOCKER_CONFIG=$(mktemp -d)
  docker login ghcr.io -u <usuario> --password-stdin     # pegar el token read:packages
  /opt/apps/neonnight/deploy.sh ghcr.io/<owner>/neonnight-web:<sha-anterior>
  docker logout ghcr.io; rm -f "$DOCKER_CONFIG/config.json"; rmdir "$DOCKER_CONFIG"
  ```
- **Sin CI ni GHCR:** el despliegue manual del §5.2, desde el commit anterior.

> **Comprobarlo antes del primer despliegue real:** como en el VPS no se guarda una `:prev`, el rollback depende de que GHCR tenga la imagen y de que el VPS pueda descargarla. Una vez que el CI publique dos versiones, prueba en el VPS un `docker pull` de la etiqueta anterior con el token de solo lectura, y luego bórrala (`docker rmi`) para mantener una sola imagen.

Durante un despliegue fallido, `deploy.sh` vuelve solo a la versión que estaba en servicio. Esa imagen se borra únicamente cuando la nueva queda sana.

### 5.4 Cambios de datos

- **Campos nuevos** en el catálogo: deben ser **opcionales** o tener un valor por defecto en `src/infrastructure/mongo/product-mapper.ts`, o migrarse en `src/infrastructure/mongo/migrate.ts`. Así una versión nueva convive con datos viejos.
- **Respaldo:** Atlas M0 no hace backups automáticos. Antes de cambios grandes de datos, corre desde tu máquina `mongodump --uri "$MONGODB_URI" --archive=backup-$(date +%F).archive.gz --gzip`, y guarda el archivo fuera del repo.
- **Migraciones al arrancar:** la primera conexión de una versión nueva corre `migrateToProducts` y luego `seedCatalog`. Las dos son idempotentes, y el seed solo inserta lo que falta, sin pisar lo editado en `/admin` (ADR 0005). Una migración de esquema (como `watches` → `products`) no tiene vuelta atrás automática: **el rollback a una versión anterior a la migración exige restaurar el respaldo** (`mongorestore --drop`).

### 5.5 Medios del catálogo (Cloudinary)

Las fotos, portadas y videos del seed están en el repo (`public/assets/…`) solo para desarrollo y tests en memoria. En producción viven en Cloudinary y sus URLs, en Atlas:

1. Despliega la versión. Al arrancar, el seed inserta lo nuevo con rutas locales (`/assets/…`).
2. Desde la máquina de desarrollo, con `MONGODB_URI`, `MONGODB_DB` y `CLOUDINARY_URL` de producción **en el entorno** (nunca en la línea de comandos), corre:
   ```bash
   node scripts/sync-catalog-media.mjs --dry-run   # qué subiría y cuántos documentos cambiaría
   node scripts/sync-catalog-media.mjs             # sube a neonnight/catalogo/ y reescribe las rutas en Atlas
   ```
   El script es idempotente: cada archivo tiene un `public_id` fijo, se sube con `overwrite: false` y solo se reescriben las rutas que aún son locales.
3. Comprueba que ninguna página pida `/assets/products/…`. Esas rutas no existen en la imagen y darían 404.

Repite el paso 2 cada vez que una versión suba `SEED_VERSION` con medios nuevos.

### 5.6 Marcas (colección `brands`)

Desde la versión con el panel › Marcas, la marca de cada producto sale de la colección `brands` y el formulario de producto exige una marca existente. Antes de desplegarla en una base que ya tiene productos:

1. Respaldo (`mongodump`, §5.4).
2. Con `MONGODB_URI`, `MONGODB_DB` y `CLOUDINARY_URL` de producción **en el entorno**:
   ```bash
   node scripts/migrate-brands.mjs --dry-run   # qué marcas crearía (una por nombre, sin tildes ni mayúsculas)
   node scripts/migrate-brands.mjs             # las crea y sube los 5 logos SVG a neonnight/sitio/marcas
   ```
   Es idempotente: no toca las marcas que ya existen. Si Cloudinary no entrega un SVG (cuentas con SVG restringido), la marca queda con su ruta `/assets/logos/brands/…`, que va dentro de la imagen.
3. Despliega. Al arrancar, el seed v3 solo inserta las marcas del seed que falten (no duplica las de la migración).

---

## 6. Operación

### 6.1 Comandos útiles (en el VPS, en `/opt/apps/neonnight`)

| Qué | Comando |
| --- | --- |
| Estado y últimos despliegues | `./deploy.sh status` |
| Logs | `docker logs --tail 200 -f neonnight-web` |
| Consumo | `docker stats --no-stream neonnight-web` |
| Versión servida | `curl -s 127.0.0.1:3100/api/health` |
| Conexión a Atlas | `curl -s '127.0.0.1:3100/api/health?deep=1'` |
| Reiniciar | `docker compose restart web` |
| Aplicar cambios del `.env` | `docker compose up -d --force-recreate web` |
| Apagar (solo Neon Night) | `docker compose stop web` |
| Encender | `docker compose start web` |

El monitoreo del VPS está en `docs/private/INFRA.md`.

### 6.2 Actualizar compose o scripts

```bash
scp deploy/docker-compose.yml deploy/deploy.sh deploy/ci-deploy.sh neonnight-vps:/opt/apps/neonnight/
ssh neonnight-vps 'cd /opt/apps/neonnight && docker compose config -q && docker compose up -d web'
```

### 6.3 Retiro total

Se hace solo dentro de `/opt/apps/neonnight`:

```bash
docker compose down -v                     # contenedor y volumen neonnight-cache (no toca la red proxy: es externa)
docker images --format '{{.Repository}}:{{.Tag}}' | grep '^neonnight-web:' | xargs -r docker rmi
```

Después, borra el proxy host de `neonightonline.com` en NPM (por su `id`) y la carpeta.

---

## 7. Dominio (DNS)

El DNS del dominio **se edita en el panel del registrador donde se compró** (no en Hostinger). El estado actual de los registros está en `docs/private/INFRA.md`.

1. Entra al panel del registrador → dominio `neonightonline.com` → **DNS / Zona DNS**.
2. Deja estos registros:

   | Tipo | Nombre | Valor | TTL |
   | --- | --- | --- | --- |
   | `A` | `@` (o `neonightonline.com`) | `<IP_VPS>` | 3600 (o el mínimo mientras se configura) |
   | `A` | `www` | `<IP_VPS>` | 3600 |

3. **Borra** los `A`, `AAAA` o `CNAME` de `@` y `www` que apunten a otro sitio, y desactiva el estacionamiento o *parking* del dominio si el panel lo ofrece.
4. Hoy no hay registros `MX`, así que no hay correo que cuidar. Si más adelante se configura correo, sus `MX` y `TXT` son independientes de estos `A`.
5. Si se agrega un registro `CAA`, debe permitir `letsencrypt.org`.
6. Comprueba con `dig +short neonightonline.com` y `dig +short www.neonightonline.com`. Ambos deben devolver `<IP_VPS>`. La propagación suele tardar minutos, pero puede llegar a 24 horas.

Cuando el DNS responde, se crea el proxy host con su certificado (§4, paso 6).

---

## 8. Accesos que necesita el proyecto

### 8.1 MongoDB Atlas

1. Crea una cuenta en <https://cloud.mongodb.com> y un proyecto `neonnight`.
2. **Cluster:** *Create* → **M0 (Free)** → AWS `us-east-1`, que es lo más cercano a un VPS en hora -05 → nombre `neonnight`.
3. **Database Access → Add New Database User:**
   - usuario `neonnight-app`, con contraseña larga generada;
   - privilegio **`readWrite@neonnight`** (en *Specific privileges*). **No uses `atlasAdmin`.**
4. **Network Access → Add IP Address:** `<IP_VPS>/32`, que es el VPS. Si vas a usar Atlas desde tu equipo, agrega también tu IP. **No uses `0.0.0.0/0`.**
5. **Connect → Drivers → Node.js:** copia `mongodb+srv://neonnight-app:<password>@neonnight.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=neonnight`. Ese es el `MONGODB_URI`.

### 8.2 Cloudinary

En <https://console.cloudinary.com>, el plan gratuito basta. Ve a **Dashboard → API Keys** y copia el **API environment variable** (`cloudinary://…`). Ese es el `CLOUDINARY_URL`.

### 8.3 Bold

Las llaves de identidad y secreta, primero de pruebas y luego de producción, se ingresan en `/admin/ajustes/pagos`. **No van en archivos.** El webhook se registra en Bold como `https://neonightonline.com/api/webhooks/bold`.

### 8.4 GitHub (CI/CD)

1. Repo **privado** con la rama `main`.
2. **Settings → Secrets and variables → Actions:**

   | Tipo | Nombre | Valor |
   | --- | --- | --- |
   | Secret | `DEPLOY_SSH_KEY` | Llave privada **nueva y dedicada al CI** (no la personal ni las de otros servicios) |
   | Secret | `DEPLOY_HOST_KEY` | Línea de `known_hosts` de `<IP_VPS>` (`ssh-keyscan -t ed25519 <IP_VPS>`, verificada) |
   | Secret | `DEPLOY_HOST` | `<IP_VPS>` |
   | Secret | `DEPLOY_USER` | `<USUARIO_DEPLOY>` |
   | Variable | `SITE_URL` | `https://neonightonline.com` |
   | Variable | `DEPLOY_ENABLED` | `true`. Activa los jobs `build` y `deploy`; solo se pone después de cargar los secretos |

3. **La llave del CI se restringe a una sola orden.** Va en el `~/.ssh/authorized_keys` de `<USUARIO_DEPLOY>` en el VPS, sin tocar las otras líneas:
   ```
   command="/opt/apps/neonnight/ci-deploy.sh",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty ssh-ed25519 AAAA… neonnight-ci
   ```
   Aunque se filtre, esa llave solo puede desplegar Neon Night: no abre una shell ni toca otros servicios. Se revoca borrando esa línea.

### 8.5 Dónde dejar los secretos

En tu máquina, **fuera del repo**, en `~/.config/neonnight/secrets.env` (permisos 600):

```
MONGODB_URI=
CLOUDINARY_URL=
WHATSAPP_NUMBER=
```

El agente lo lee y lo copia al `.env` del VPS **por stdin**, sin mostrarlo. `SITE_URL`, `ADMIN_PASSWORD` y `ADMIN_SECRET` ya están en el VPS. La contraseña del panel está en `~/.config/neonnight/admin-password` (permisos 600).

---

## 9. Estado actual y checklist

| Dato | Valor |
| --- | --- |
| Subdominio | `neonightonline.com` y `www.neonightonline.com` |
| Contenedor y puerto interno | `neonnight-web:3000` en la red `proxy`; loopback `127.0.0.1:3100` |
| Proxy host de NPM (id) | _pendiente (se crea cuando el DNS apunte al VPS)_ |
| Versión desplegada | `2beb615` (2026-10-20, despliegue manual). Ver `./deploy.sh status` |

- [x] Reconocimiento del VPS (solo lectura) y capacidad confirmada.
- [x] `/opt/apps/neonnight/` con compose, scripts y `.env` (600).
- [x] Contenedor `neonnight-web` sano, con límites y en solo lectura, sin puertos en `0.0.0.0`.
- [ ] `MONGODB_URI` y `CLOUDINARY_URL` en el `.env`, y `/api/health?deep=1` con `"db":"mongodb"`.
- [ ] DNS de `@` y `www` → `<IP_VPS>`.
- [ ] Proxy host y certificado en NPM, con su `id` anotado arriba.
- [ ] Repo en GitHub con los secretos del §8.4; el primer deploy por CI verifica el SHA.
- [ ] Rollback probado: `docker pull` en el VPS de una etiqueta anterior de GHCR con un token `read:packages` (§5.3).
- [ ] Llaves de Bold en `/admin/ajustes/pagos` y webhook registrado.
- [ ] Los demás servicios del VPS intactos (§4, paso 8).
