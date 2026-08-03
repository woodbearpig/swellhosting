#!/usr/bin/env bash
# Interactive .env generator for swell design + media.
# Handles secret generation and prompts for everything else.
# Usage: ./deploy/setup-env.sh

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
    echo "⚠️  .env already exists."
    read -p "Overwrite it? [y/N] " ans
    [[ "$ans" == "y" || "$ans" == "Y" ]] || { echo "Cancelled."; exit 0; }
    cp .env .env.backup.$(date +%s)
    echo "→ Existing .env backed up."
fi

echo
echo "==== swell design + media — first-time environment setup ===="
echo

# --- Secrets ---
echo "→ Generating JWT_SECRET (48 bytes, hex)"
JWT_SECRET_VAL=$(openssl rand -hex 48)

echo "→ Generating FERNET_KEY (encrypts OAuth + Instagram tokens)"
if command -v python3 >/dev/null 2>&1 && python3 -c "from cryptography.fernet import Fernet" 2>/dev/null; then
    FERNET_VAL=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
else
    echo "  (using Docker to generate...)"
    FERNET_VAL=$(docker run --rm python:3.11-slim sh -c "pip install -q cryptography && python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'" 2>/dev/null | tail -1)
fi

# --- Prompts ---
read -p "Admin email [admin@swelldesignla.com]: " ADMIN_EMAIL_IN
ADMIN_EMAIL_IN=${ADMIN_EMAIL_IN:-admin@swelldesignla.com}

while true; do
    read -s -p "Admin password (min 8 chars): " ADMIN_PW1; echo
    read -s -p "Confirm password: " ADMIN_PW2; echo
    [ "$ADMIN_PW1" = "$ADMIN_PW2" ] && [ ${#ADMIN_PW1} -ge 8 ] && break
    echo "Passwords don't match or too short. Try again."
done

read -p "Primary domain [swelldesignla.com]: " DOMAIN_IN
DOMAIN_IN=${DOMAIN_IN:-swelldesignla.com}

read -p "Let's Encrypt notification email: " LE_EMAIL
[ -z "$LE_EMAIL" ] && LE_EMAIL="$ADMIN_EMAIL_IN"

# --- Write .env ---
cat > .env <<EOF
# swell design + media — production environment (generated $(date -u +%Y-%m-%dT%H:%M:%SZ))

DB_NAME=swell_design_media

JWT_SECRET=$JWT_SECRET_VAL
JWT_ALG=HS256
JWT_EXPIRE_HOURS=168

ADMIN_EMAIL=$ADMIN_EMAIL_IN
ADMIN_PASSWORD=$ADMIN_PW1
ADMIN_NAME=Swell Admin

CORS_ORIGINS=https://$DOMAIN_IN,https://www.$DOMAIN_IN

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=hello@$DOMAIN_IN
SMTP_FROM_NAME=swell design + media

BUSINESS_NAME=swell design + media
BUSINESS_EMAIL=hello@$DOMAIN_IN
BUSINESS_PHONE=
BUSINESS_LOCATION=Los Angeles, CA

DOMAIN=$DOMAIN_IN
EMAIL_FOR_LETSENCRYPT=$LE_EMAIL

PUBLIC_BACKEND_URL=https://$DOMAIN_IN
PUBLIC_FRONTEND_URL=https://$DOMAIN_IN

FERNET_KEY=$FERNET_VAL
META_GRAPH_VERSION=v20.0
EOF

chmod 600 .env
echo
echo "✅ .env written ($(wc -l < .env) lines). Permissions set to 600."
echo
echo "Next steps:"
echo "  1. Review with:   cat .env"
echo "  2. Redeploy:      ./deploy.sh"
echo "  3. Enable HTTPS:  ./deploy/issue-ssl.sh"
