#!/usr/bin/env bash
# Despliega una versión de Neon Night en el VPS de producción.
#
#   /opt/apps/neonnight/deploy.sh ghcr.io/<owner>/neonnight-web:<sha>   # desde el registro (CI)
#   /opt/apps/neonnight/deploy.sh neonnight-web:<sha>                   # imagen ya cargada con `docker load`
#   /opt/apps/neonnight/deploy.sh status                                # solo lectura: qué versión corre
#
# 1. Descarga la imagen si no está.  2. La marca como `current` y recrea SOLO neonnight-web.
# 3. Espera a que quede sana y sirviendo ESA versión (un 200 de un contenedor viejo no basta).
# 4. Si falla, vuelve a la imagen anterior (que sigue en disco hasta ese momento) y termina con error.
# 5. Si todo va bien, borra las imágenes anteriores de neonnight-web: en el VPS queda UNA sola.
#    El historial vive en el registro; un rollback es redesplegar el SHA anterior.
# Cada ejecución queda en deploys.log. Nunca toca contenedores, redes ni imágenes de otros proyectos.
set -euo pipefail
cd "$(dirname "$0")"

CONTAINER=neonnight-web
LOCAL=neonnight-web
PORT=3100
LOG=deploys.log

health() { curl -fsS --max-time 3 "http://127.0.0.1:$PORT/api/health" 2>/dev/null || true; }
log() { printf '%s %s\n' "$(date -Iseconds)" "$*" >> "$LOG"; }

if [ "${1:-}" = status ]; then
  docker ps -a --filter "name=^${CONTAINER}$" --format '{{.Names}}: {{.Status}} ({{.Image}})'
  echo "health: $(health)"
  tail -n 5 "$LOG" 2>/dev/null || true
  exit 0
fi

IMAGE=${1:?Uso: deploy.sh <imagen:tag> | status}

docker image inspect "$IMAGE" >/dev/null 2>&1 || docker pull "$IMAGE"
NEW_ID=$(docker image inspect -f '{{.Id}}' "$IMAGE")
VERSION=$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$IMAGE")
PREV_ID=$(docker inspect -f '{{.Image}}' "$CONTAINER" 2>/dev/null || true)

echo "→ Desplegando $IMAGE (versión $VERSION)"
log "inicio $IMAGE version=$VERSION"
docker tag "$IMAGE" "$LOCAL:current"
docker compose up -d --no-deps --force-recreate web

healthy=false
status=starting
served=
for _ in $(seq 1 40); do
  status=$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo missing)
  served=$(health | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || true)
  if [ "$status" = healthy ] && [ "$served" = "$VERSION" ]; then healthy=true; break; fi
  sleep 3
done

if [ "$healthy" != true ]; then
  echo "✗ La versión $VERSION no quedó sana (estado: $status, sirve: ${served:-nada})." >&2
  docker logs --tail 40 "$CONTAINER" >&2 || true
  log "FALLO version=$VERSION estado=$status"
  if [ -n "$PREV_ID" ] && [ "$PREV_ID" != "$NEW_ID" ]; then
    echo "↩ Volviendo a la imagen anterior." >&2
    docker tag "$PREV_ID" "$LOCAL:current"
    docker compose up -d --no-deps --force-recreate web
    log "rollback a ${PREV_ID:7:12}"
  fi
  exit 1
fi

# Una sola imagen en el VPS: se borran las demás de neonnight-web (nunca imágenes de otros proyectos).
docker images --no-trunc --format '{{.Repository}}:{{.Tag}} {{.ID}}' \
  | awk -v keep="$NEW_ID" '$1 ~ /(^|\/)neonnight-web:/ && $2 != keep {print $1}' \
  | xargs -r docker rmi >/dev/null 2>&1 || true
docker image prune -f --filter "label=org.opencontainers.image.title=neonnight-web" >/dev/null

log "OK version=$VERSION"
echo "✓ Neon Night $VERSION en servicio"
