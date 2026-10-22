#!/usr/bin/env bash
# Arranca la salida standalone COMO EL HOSTING (sin el árbol del repo: solo
# .next/standalone + public + .next/static) y comprueba que el brand pack se
# aplique y que un pack ausente no tumbe el arranque.
# Uso: MONGODB_URI=mongodb://127.0.0.1:27017 scripts/smoke-standalone.sh   (después de `npm run build`)
set -euo pipefail
: "${MONGODB_URI:?Falta MONGODB_URI (un Mongo desechable)}"
DIR=$(mktemp -d)
trap 'kill $PID 2>/dev/null || true; rm -rf "$DIR"' EXIT
cp -r .next/standalone/. "$DIR/"
cp -r public "$DIR/public"
mkdir -p "$DIR/.next" && cp -r .next/static "$DIR/.next/static"
rm -rf "$DIR/brands"   # el pack debe salir del bundle, no del disco

run() { # $1 = base, $2 = pack, $3 = puerto
  # exec: el PID que se guarda es el del servidor (si no, `kill` deja el node vivo).
  (cd "$DIR" && MONGODB_DB="$1" STORE_SLUG=neonnight STORE_ORDER_PREFIX=NN STORE_BRAND_PACK="$2" SITE_URL=http://localhost:$3 \
    ADMIN_PASSWORD=smoke-standalone-123 ADMIN_SECRET=smoke-standalone-secret-0000000000000 PORT=$3 HOSTNAME=127.0.0.1 exec node server.js > "$DIR/log-$3" 2>&1) &
  PID=$!
  for _ in $(seq 1 60); do curl -fs "http://127.0.0.1:$3/api/health" >/dev/null && return 0; sleep 1; done
  cat "$DIR/log-$3"; return 1
}

run "smoke_$RANDOM" brands/neonnight/brand.json 3701
curl -fs http://127.0.0.1:3701/ | grep -q "<title>Neon Night — " || { echo "✗ el pack no se aplicó"; cat "$DIR/log-3701"; exit 1; }
curl -fs http://127.0.0.1:3701/api/health | grep -q '"brand_pack":"aplicada"' || { echo "✗ health sin brand_pack aplicada"; exit 1; }
curl -fs -o /dev/null http://127.0.0.1:3701/icons/icon-512.png || { echo "✗ íconos del pack"; exit 1; }
echo "✓ standalone aplica el pack de Neon Night"
kill $PID; wait $PID 2>/dev/null || true

run "smoke_$RANDOM" brands/no-existe.json 3702
curl -fs -o /dev/null http://127.0.0.1:3702/ || { echo "✗ un pack ausente tumbó la tienda"; exit 1; }
curl -fs http://127.0.0.1:3702/api/health | grep -q '"brand_pack":"error"' || { echo "✗ health no reporta el error del pack"; exit 1; }
echo "✓ un pack ausente no tumba el arranque (health: brand_pack error)"
