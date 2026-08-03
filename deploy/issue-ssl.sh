#!/usr/bin/env bash
# First-time SSL certificate issuance via Let's Encrypt.
# Run this AFTER the site is running on HTTP (nginx serving on port 80).

set -euo pipefail
cd "$(dirname "$0")/.."

source .env

DOMAIN="${DOMAIN:-swelldesignla.com}"
EMAIL="${EMAIL_FOR_LETSENCRYPT:-you@example.com}"

echo "→ Requesting certificate for $DOMAIN and www.$DOMAIN via HTTP-01…"

docker compose run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL --agree-tos --no-eff-email \
    -d $DOMAIN -d www.$DOMAIN" certbot

echo "→ Swapping to HTTPS nginx config…"
mv deploy/nginx/conf.d/swelldesignla.conf deploy/nginx/conf.d/swelldesignla.http-only.conf.disabled 2>/dev/null || true
cp deploy/nginx/conf.d/swelldesignla.ssl.conf.disabled deploy/nginx/conf.d/swelldesignla.conf

echo "→ Reloading nginx…"
docker compose exec nginx nginx -s reload

echo "✅ SSL issued. Site is now available over HTTPS."
