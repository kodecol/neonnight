#!/usr/bin/env bash
# Demo host (TENANCY=multi) desde la salida standalone, COMO EL HOSTING: sin el
# árbol del repo, sin brands/ y sin las fotos del catálogo real
# (public/assets/products). Alta de una demo por la API firmada, seed de
# joyería, página de la demo, 404 del dominio principal y baja.
# Uso: MONGODB_URI=mongodb://127.0.0.1:27017 scripts/smoke-standalone-multi.sh   (después de `npm run build`)
set -euo pipefail
: "${MONGODB_URI:?Falta MONGODB_URI (un Mongo desechable)}"
DIR=$(mktemp -d); PORT=${PORT:-3711}; PID=
trap '[ -n "$PID" ] && kill $PID 2>/dev/null; rm -rf "$DIR"' EXIT
cp -r .next/standalone/. "$DIR/"; cp -r public "$DIR/public"; mkdir -p "$DIR/.next" && cp -r .next/static "$DIR/.next/static"
rm -rf "$DIR/brands" "$DIR/public/assets/products"
export KODE_HOST_KEY=$(printf 'k%.0s' {1..48})
MAIN=principal.hosting.example

(cd "$DIR" && TENANCY=multi DEMO_ZONE=kodecol.co MONGODB_URI="$MONGODB_URI" DEMO_MASTER_SECRET=$(printf 'm%.0s' {1..48}) KODE_HOST_KEY="$KODE_HOST_KEY" \
  MEDIA_DIR="$DIR/media" PORT=$PORT HOSTNAME=127.0.0.1 exec node server.js > "$DIR/log" 2>&1) &
PID=$!
for _ in $(seq 1 60); do curl -fs "http://127.0.0.1:$PORT/api/health" >/dev/null && break; sleep 1; done

kode() { # método ruta [archivo-cuerpo]
  node -e '
    const { createHash, createHmac, randomBytes } = require("node:crypto");
    const [method, path, file] = process.argv.slice(1);
    const body = file ? require("node:fs").readFileSync(file, "utf8") : "";
    const ts = String(Math.floor(Date.now() / 1000)), nonce = randomBytes(16).toString("hex");
    const sig = createHmac("sha256", process.env.KODE_HOST_KEY).update([method, path, ts, nonce, createHash("sha256").update(body).digest("hex")].join("\n")).digest("hex");
    fetch(`http://127.0.0.1:${process.env.PORT}${path}`, { method, body: body || undefined, headers: { "content-type": "application/json", host: process.env.MAIN, "x-kode-timestamp": ts, "x-kode-nonce": nonce, "x-kode-signature": `v1=${sig}` } })
      .then(async (r) => { const t = await r.text(); console.log(t); if (!r.ok) process.exit(1); });
  ' "$@"
}
export PORT MAIN

fail() { echo "✗ $1"; tail -30 "$DIR/log"; exit 1; }
curl -fs -H "Host: $MAIN" "http://127.0.0.1:$PORT/api/health?deep=1" | grep -q '"tenants":0' || fail "health deep sin tenants:0"
code=$(curl -s -o "$DIR/main.html" -w '%{http_code}' -H "Host: $MAIN" "http://127.0.0.1:$PORT/")
[ "$code" = 404 ] || fail "el dominio principal debía dar 404 (dio $code)"
grep -q "/assets/products" "$DIR/main.html" && fail "el 404 del dominio principal pide fotos del catálogo real"
echo "✓ health y 404 del dominio principal, sin catálogo real"

node -e '
  const b = JSON.parse(require("node:fs").readFileSync("examples/brand.example.json", "utf8"));
  require("node:fs").writeFileSync(process.argv[1], JSON.stringify({ brand: b, niche: "joyeria", hosts: ["aurora-joyeria.kodecol.co"], expires_at: new Date(Date.now() + 864e5).toISOString(), admin_password: "smoke-multi-clave-123" }));
' "$DIR/upsert.json"
kode PUT /api/_kode/tenants/aurora-joyeria "$DIR/upsert.json" | grep -q '"seeded":true' || fail "upsert"
curl -fs -H "Host: aurora-joyeria.kodecol.co" "http://127.0.0.1:$PORT/" > "$DIR/aurora.html" || fail "home de la demo"
grep -q "<title>Aurora Joyería" "$DIR/aurora.html" || fail "título de la demo"
grep -q "/assets/products" "$DIR/aurora.html" && fail "la demo pide fotos del catálogo real"
img=$(curl -fs -H "Host: aurora-joyeria.kodecol.co" "http://127.0.0.1:$PORT/coleccion" | grep -o '/assets/demo/[a-z]*/[a-z0-9-]*\.webp' | head -1)
[ -n "$img" ] || fail "la colección no trae fotos de demo"
curl -fs -o /dev/null -H "Host: aurora-joyeria.kodecol.co" "http://127.0.0.1:$PORT$img" || fail "foto de demo $img"
curl -fs -o /dev/null -H "Host: aurora-joyeria.kodecol.co" "http://127.0.0.1:$PORT/_next/image?url=$(node -p 'encodeURIComponent(process.argv[1])' "$img")&w=640&q=75" || fail "next/image de $img"
echo "✓ demo creada por la API, con su marca y el seed de joyería (/assets/demo)"
kode DELETE /api/_kode/tenants/aurora-joyeria | grep -q '"deleted":true' || fail "delete"
[ "$(curl -s -o /dev/null -w '%{http_code}' -H "Host: aurora-joyeria.kodecol.co" "http://127.0.0.1:$PORT/")" = 404 ] || fail "la demo borrada debía dar 404"
grep -qi "assets/products" "$DIR/log" && fail "el log menciona /assets/products"
echo "✓ demo borrada; ningún pedido de /assets/products en el log"
