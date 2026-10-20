#!/usr/bin/env bash
# Orden forzada de la llave SSH del CI (authorized_keys: command="/opt/apps/neonnight/ci-deploy.sh",…).
# La llave solo puede hacer esto: desplegar una imagen de neonnight-web desde GHCR.
#
#   echo "$GHCR_TOKEN" | ssh <usuario>@<ip-vps> "ghcr.io/<owner>/neonnight-web:<sha> <usuario-ghcr>"
#
# El token llega por stdin. La sesión del registro usa un DOCKER_CONFIG propio y temporal,
# así no se pisa ni se cierra la sesión de ghcr.io que usen otros proyectos del VPS.
set -euo pipefail

read -r IMAGE GHCR_USER EXTRA <<<"${SSH_ORIGINAL_COMMAND:-}"
if [ -n "${EXTRA:-}" ] \
  || ! [[ "${IMAGE:-}" =~ ^ghcr\.io/[a-z0-9_.-]+/neonnight-web:[0-9a-f]{7,40}$ ]] \
  || ! [[ "${GHCR_USER:-}" =~ ^[A-Za-z0-9_.-]+$ ]]; then
  echo "Orden rechazada. Uso: <ghcr.io/owner/neonnight-web:sha> <usuario>" >&2
  exit 2
fi

DOCKER_CONFIG=$(mktemp -d /opt/apps/neonnight/.docker-ci.XXXXXX)
export DOCKER_CONFIG
cleanup() {
  docker logout ghcr.io >/dev/null 2>&1 || true
  rm -f "$DOCKER_CONFIG/config.json"
  rmdir "$DOCKER_CONFIG" 2>/dev/null || true
}
trap cleanup EXIT

docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
/opt/apps/neonnight/deploy.sh "$IMAGE"
