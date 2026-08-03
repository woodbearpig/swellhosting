#!/usr/bin/env bash
# First-time SSL certificate issuance via Let's Encrypt.
# Run this AFTER the site is running on HTTP (nginx serving on port 80).

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "❌ .env not found. Run ./deploy/setup-env.sh first."
    exit 1
fi

# Safely extract values from .env without executing it (values may contain spaces/special chars)
get_env() {
    local key="$1"; local default="${2:-}"
    local val
    val=$(grep -E "^${key}=" .env | head -1 | cut -d'=' -f2- | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")
    echo "${val:-$default}"
}

DOMAIN=$(get_env DOMAIN swelldesignla.com)
EMAIL=$(get_env EMAIL_FOR_LETSENCRYPT you@example.com)

if [ "$EMAIL" = "you@example.com" ]; then
    echo "⚠️  EMAIL_FOR_LETSENCRYPT is still the placeholder. Edit .env and try again."
    exit 1
fi

echo "→ Requesting certificate for $DOMAIN and www.$DOMAIN via HTTP-01…"
echo "    (Let's Encrypt notifications will go to: $EMAIL)"

docker compose run --rm --entrypoint "" certbot certbot certonly --webroot -w /var/www/certbot \
    --email "$EMAIL" --agree-tos --no-eff-email \
    -d "$DOMAIN" -d "www.$DOMAIN"

echo "→ Swapping to HTTPS nginx config…"
if [ -f deploy/nginx/conf.d/swelldesignla.conf ]; then
    mv deploy/nginx/conf.d/swelldesignla.conf deploy/nginx/conf.d/swelldesignla.http-only.conf.disabled
fi
cp deploy/nginx/conf.d/swelldesignla.ssl.conf.disabled deploy/nginx/conf.d/swelldesignla.conf

# Replace domain placeholder in the SSL config (in case they use a different domain)
sed -i "s/swelldesignla\.com/${DOMAIN}/g" deploy/nginx/conf.d/swelldesignla.conf

echo "→ Reloading nginx…"
docker compose exec nginx nginx -s reload

echo "✅ SSL issued. Site is now available at https://$DOMAIN"
