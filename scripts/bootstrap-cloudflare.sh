#!/usr/bin/env bash
# One-time Cloudflare setup for production and staging. Safe to re-run: it creates only what is
# missing and asks before replacing a secret.
#   1. the D1 databases draycottdrams and draycottdrams-staging, with their ids written into
#      wrangler.jsonc, and the workers.dev URLs filled in
#   2. the Worker secrets for each environment (BETTER_AUTH_SECRET is generated; Google and
#      MapTiler values are prompted for)
#   3. the D1 migrations on both databases
# The AI Gateway (id `draycottdrams`) is made in the dashboard: see docs/DEPLOYMENT.md.
#
# Usage: pnpm exec wrangler login && scripts/bootstrap-cloudflare.sh <workers.dev subdomain>
#   (the subdomain is under Workers & Pages → Overview → "Subdomain", e.g. `tomseagrave` for
#   tomseagrave.workers.dev)
set -euo pipefail
cd "$(dirname "$0")/.."

sub=${1:?usage: scripts/bootstrap-cloudflare.sh <workers.dev subdomain>}
[[ "$sub" =~ ^[a-z0-9-]+$ ]] || { echo "not a workers.dev subdomain: $sub" >&2; exit 2; }
wrangler() { pnpm exec wrangler "$@"; }
wrangler whoami >/dev/null || { echo "run: pnpm exec wrangler login" >&2; exit 1; }

# 1. D1 databases, and their ids in wrangler.jsonc.
d1_id() { # d1_id <name> → id, creating the database if it doesn't exist
  local name=$1 id
  id=$(wrangler d1 list --json | jq -r --arg n "$name" '.[] | select(.name == $n) | .uuid')
  if [ -z "$id" ]; then
    wrangler d1 create "$name" --location weur >&2
    id=$(wrangler d1 list --json | jq -r --arg n "$name" '.[] | select(.name == $n) | .uuid')
  fi
  [ -n "$id" ] || { echo "could not find or create D1 database $name" >&2; exit 1; }
  echo "$id"
}
prod_id=$(d1_id draycottdrams)
staging_id=$(d1_id draycottdrams-staging)
sed -i \
  -e "s/CHANGE-ME-production-d1-id/$prod_id/" \
  -e "s/CHANGE-ME-staging-d1-id/$staging_id/" \
  -e "s/\.CHANGE-ME\.workers\.dev/.$sub.workers.dev/g" \
  wrangler.jsonc
echo "wrangler.jsonc: production D1 $prod_id, staging D1 $staging_id, *.$sub.workers.dev"

# 2. Secrets, per Worker. Values go through stdin, never the command line.
secret_names() { # secret_names [--env staging] → names already set
  wrangler secret list "$@" --format json 2>/dev/null | jq -r '.[].name' || true
}
put_secrets() { # put_secrets <label> [--env staging]
  local label=$1; shift
  local have
  have=$(secret_names "$@")
  echo "== secrets for $label"
  for name in BETTER_AUTH_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET MAPTILER_API_KEY; do
    if grep -qx "$name" <<< "$have"; then
      read -r -p "$name is set. Replace it? [y/N] " yn
      [[ "$yn" =~ ^[Yy]$ ]] || continue
    fi
    if [ "$name" = BETTER_AUTH_SECRET ]; then
      openssl rand -base64 32 | wrangler secret put "$name" "$@"
    else
      read -r -s -p "$name ($label, empty to skip): " value; echo
      [ -n "$value" ] || continue
      printf '%s' "$value" | wrangler secret put "$name" "$@"
    fi
  done
}
# A Worker must exist before it can hold secrets: deploy each once (staging first).
CLOUDFLARE_ENV=staging pnpm build && wrangler deploy
pnpm build && wrangler deploy
put_secrets staging --env staging -c wrangler.jsonc
put_secrets production -c wrangler.jsonc

# 3. Schema on both databases.
pnpm db:migrate:staging
pnpm db:migrate:production

cat <<EOF

Done. Still to do by hand (docs/DEPLOYMENT.md has the details):
  - AI Gateway: create gateway id "draycottdrams" (AI → AI Gateway).
  - Google OAuth client: add these Authorised redirect URIs
      https://draycottdrams.$sub.workers.dev/api/auth/callback/google
      https://draycottdrams-staging.$sub.workers.dev/api/auth/callback/google
  - GitHub: repository secrets CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID; environments
    "staging" and "production" (add required reviewers to production).
  - Commit wrangler.jsonc (the ids and URLs are not secret).
EOF
