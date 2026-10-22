# Despliegue de Neon Night

> Desde el 2026-10-22 Neon Night corre como **app Node.js en un hosting administrado** y se publica con **Kode**, la plataforma de Kodecol. El VPS anterior (Docker detrás de un proxy inverso compartido) se retiró por completo: no queda contenedor, proxy, certificado ni carpeta.
> Los valores reales (proveedor, cuentas, accesos) están solo en `docs/private/INFRA.md`, fuera del repo.

## 1. Arquitectura

| Pieza | Dónde | Nota |
| --- | --- | --- |
| App | Hosting Node.js administrado | Construye `main` con `npm run build` y corre `next start`. HTTPS y certificado los pone el hosting |
| Datos | MongoDB Atlas (base `neonnight`) | Lista de IPs permitidas: la IP de salida del hosting y la de desarrollo |
| Fotos | Cloudinary (`neonnight/…`) | Las subidas del panel van ahí; la app no guarda archivos en disco |
| Pagos | Bold (Links de pago + webhook `/api/webhooks/bold`) | Llaves en `/admin/ajustes/pagos`, cifradas con `ADMIN_SECRET` |
| DNS | Zona del dominio en el proveedor del hosting | `@` y `www` hacia la app. Sin `AAAA` sobrantes |
| Secretos | Bóveda de Kode (`app/neonnight/env`) | Nunca en el repo ni en el chat |

## 2. Publicar una versión

1. Integrar en `main` (fast-forward, ver `docs/GITHUB.md`). El CI verifica tipos, lint, tests y build, y **no despliega**.
2. `kode deploy neonnight`: el hosting construye `main` con las variables de la bóveda y lo publica.
3. Verificar:
   - `https://neonightonline.com/api/health?deep=1` → `status: "ok"`, `version` igual al SHA publicado y `db: "mongodb"`.
   - La tienda, una ficha, `/checkout` y un login real en `/admin/login`.

**Rollback:** `kode deploy neonnight` sobre el commit anterior. Antes de un cambio de datos sin vuelta atrás, saca un respaldo (§4).

## 3. Variables de entorno (runtime)

Viven en la bóveda de Kode (`app/neonnight/env`) y Kode las carga en el hosting. La lista completa con su descripción está en `template.manifest.json`. Las que usa Neon Night:

| Variable | Nota |
| --- | --- |
| `SITE_URL` | `https://neonightonline.com`: canonical, sitemap, OG y retorno de Bold |
| `MONGODB_URI`, `MONGODB_DB` | Atlas. `MONGODB_DB` es obligatoria |
| `CLOUDINARY_URL` | Fotos del panel |
| `ADMIN_PASSWORD` | Contraseña **inicial** del panel; al cambiarla en `/admin/ajustes/seguridad` rige la de la base |
| `ADMIN_SECRET` | 32+ caracteres. Si cambia, hay que reingresar la llave de Bold y se cierran las sesiones |
| `WHATSAPP_NUMBER` | Con indicativo, solo dígitos |
| `GA_MEASUREMENT_ID`, `META_PIXEL_ID` | Solo cargan con consentimiento |
| `GOOGLE_SITE_VERIFICATION`, `META_DOMAIN_VERIFICATION` | Verificación de dominio |

El hosting no acepta valores vacíos: una variable sin valor simplemente no se carga.

## 4. Datos

- **Campos nuevos** del catálogo: opcionales o con valor por defecto en el mapper, o con una migración nueva en `src/infrastructure/mongo/migrations.ts` (idempotente, se aplica sola al arrancar).
- **Respaldo:** Atlas M0 no hace backups automáticos. Antes de cambios grandes:
  `mongodump --uri "$MONGODB_URI" --db neonnight --gzip --archive=backup-$(date +%F).archive.gz`, con la URI en el entorno, nunca en la línea de comandos. Guarda el archivo fuera del repo.
- **Medios del seed y marcas:** `scripts/sync-catalog-media.mjs` y `scripts/migrate-brands.mjs` (con `--dry-run` primero) corren desde la máquina de desarrollo contra Atlas y Cloudinary de producción, con las variables en el entorno.

## 5. Endpoint de salud

`GET /api/health` → `{"status":"ok","version":"<sha>","db":"mongodb"}`. Con `?deep=1` además consulta la base. Un 200 no basta: compara `version` con el SHA publicado.

## 6. Accesos

- **Atlas:** usuario con `readWrite@neonnight`, no `atlasAdmin`. En *Network Access*, solo las IPs necesarias, nunca `0.0.0.0/0`.
- **Cloudinary:** el *API environment variable* (`cloudinary://…`) es el `CLOUDINARY_URL`.
- **Bold:** llaves en `/admin/ajustes/pagos`; webhook en Bold: `https://neonightonline.com/api/webhooks/bold`. Con Bold apagado, el webhook rechaza todo (401).
- **Panel:** la cookie de sesión es `Secure`, así que el panel solo funciona por HTTPS.

## 7. Historial

- 2026-10-19: primera instalación en un VPS propio de terceros, con Docker.
- 2026-10-20: mudanza a otro VPS compartido, detrás de nginx-proxy-manager, con Atlas y Cloudinary.
- 2026-10-22: mudanza al hosting Node.js administrado, publicado con Kode. El VPS anterior se retiró por completo.
