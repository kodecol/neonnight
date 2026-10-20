#!/usr/bin/env bash
# Configura el repositorio de GitHub de Neon Night (docs/GITHUB.md §8). Idempotente.
# Requiere `gh` autenticado con permiso **admin** sobre el repo.
#
#   scripts/github-setup.sh                 # kodecol/neonnight
#   scripts/github-setup.sh otra-org/repo
set -euo pipefail

REPO=${1:-kodecol/neonnight}
SITE=https://neonightonline.com
gh repo view "$REPO" --json viewerPermission -q .viewerPermission | grep -qx ADMIN \
  || { echo "✗ Se necesita permiso ADMIN sobre $REPO (gh auth status)." >&2; exit 1; }

echo "→ Datos del repositorio"
gh repo edit "$REPO" \
  --description "Plataforma de retail online para joyería, relojería y perfumería premium. Next.js 15 (App Router, SSR), MongoDB Atlas, checkout con Bold y webhooks, admin propio y despliegue en Docker con CI/CD." \
  --homepage "$SITE" \
  --add-topic nextjs,react,typescript,ecommerce,mongodb,cloudinary,bold,docker,github-actions,clean-architecture,tailwindcss,gitmoji \
  --enable-issues --enable-wiki=false --enable-projects=false \
  --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false \
  --delete-branch-on-merge --enable-auto-merge
# El commit de squash usa el título del PR (gitmoji) y la descripción como cuerpo.
gh api -X PATCH "repos/$REPO" -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY >/dev/null

echo "→ Seguridad (alertas de dependencias, actualizaciones de seguridad, escaneo de secretos)"
gh api -X PUT "repos/$REPO/vulnerability-alerts" >/dev/null
gh api -X PUT "repos/$REPO/automated-security-fixes" >/dev/null
gh api -X PATCH "repos/$REPO" --input - >/dev/null <<'JSON' || echo "  (escaneo de secretos no disponible en este plan)"
{ "security_and_analysis": { "secret_scanning": { "status": "enabled" }, "secret_scanning_push_protection": { "status": "enabled" } } }
JSON

echo "→ Etiquetas"
label() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null; }
label "tipo: funcionalidad"  "1f883d" "✨ Nueva funcionalidad"
label "tipo: bug"            "d1242f" "🐛 Algo no funciona"
label "tipo: seguridad"      "8250df" "🔒️ Seguridad o privacidad"
label "tipo: rendimiento"    "fbca04" "⚡️ Rendimiento"
label "tipo: refactor"       "0e8a16" "♻️ Refactor sin cambio funcional"
label "tipo: docs"           "0075ca" "📝 Documentación"
label "tipo: dependencias"   "0366d6" "⬆️ Dependencias"
label "tipo: infraestructura" "5319e7" "🧱 CI/CD, Docker, despliegue"
label "cambio incompatible"  "b60205" "💥 Rompe compatibilidad"
label "área: tienda"         "c5def5" "Tienda pública"
label "área: checkout"       "c5def5" "Carrito, checkout y Bold"
label "área: admin"          "c5def5" "Panel /admin"
label "área: ci"             "c5def5" "GitHub Actions"
label "área: infraestructura" "c5def5" "VPS, Docker, nginx-proxy-manager"
label "estado: por revisar"  "ededed" "Pendiente de triage"
label "estado: bloqueado"    "e99695" "Depende de algo externo"
label "omitir-changelog"     "ffffff" "No aparece en las notas de versión"

echo "→ Regla de protección de main (ruleset)"
RULESET_ID=$(gh api "repos/$REPO/rulesets" -q '.[] | select(.name=="main protegida") | .id' 2>/dev/null || true)
RULESET=$(cat <<'JSON'
{
  "name": "main protegida",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["squash"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [ { "context": "check" }, { "context": "pr-title" } ] } }
  ],
  "bypass_actors": [ { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "pull_request" } ]
}
JSON
)
if [ -n "$RULESET_ID" ]; then
  gh api -X PUT "repos/$REPO/rulesets/$RULESET_ID" --input - >/dev/null <<<"$RULESET"
else
  gh api -X POST "repos/$REPO/rulesets" --input - >/dev/null <<<"$RULESET"
fi

echo "→ Entorno production (aprobación opcional antes de desplegar)"
gh api -X PUT "repos/$REPO/environments/production" -F wait_timer=0 >/dev/null

echo "→ Variable del CI"
gh variable set SITE_URL --repo "$REPO" --body "$SITE"

echo "✓ Repositorio configurado. Faltan los secretos de despliegue (docs/DEPLOY.md §8.4):"
echo "  DEPLOY_SSH_KEY, DEPLOY_HOST_KEY, DEPLOY_HOST, DEPLOY_USER → gh secret set <NOMBRE> --repo $REPO < archivo"
